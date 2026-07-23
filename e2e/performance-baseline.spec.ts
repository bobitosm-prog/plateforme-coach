import { expect, test, type Browser, type Page, type Request } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { classifyLocalRequest, REQUEST_CATEGORIES, stableJson, summarizeNumbers, summarizeRequests, type RequestSample, type RequestSummary } from '../lib/performance/baseline'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import { assertNoSyntheticCoachClientRows, buildCoachClientFixture, cleanupCoachClientFixture, loginLocalPersona, seedCoachClientFixture, type CoachClientFixture } from './helpers/coach-client-fixtures'

type InteractionDiagnostic = {
  interactionId: number
  eventType: string
  duration: number
  startTime: number
  targetCode: string
  step: string
  thermalState: 'cold' | 'warm'
  javascriptRequestedInStep: boolean
}
type LongTaskDiagnostic = { duration: number; startTime: number; step: string }
type LcpDiagnostic = { startTime: number; targetCode: string; step: string }
type VitalSnapshot = {
  lcp: number | null
  cls: number
  inp: number | null
  interactionCount: number
  eventTimingSupported: boolean
  interactions: InteractionDiagnostic[]
  longTasks: LongTaskDiagnostic[]
  lcpEntry: LcpDiagnostic | null
}
type StepResult = { name: string; requests: ReturnType<typeof summarizeRequests> }
type JourneyRun = { pass: number; vitals: VitalSnapshot; segments: VitalSnapshot[]; steps: StepResult[]; requests: RequestSummary }

declare global {
  interface Window {
    __moovxBaseline: {
      reset: () => void
      setContext: (step: string, thermalState: 'cold' | 'warm') => void
      snapshot: () => VitalSnapshot
    }
  }
}

const APP_URL = new URL(process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3211')
const RAW_PATH = process.env.MOOVX_BASELINE_RAW_PATH
const DIAGNOSTICS_ENABLED = process.env.MOOVX_PERFORMANCE_DIAGNOSTICS === '1'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

if (!RAW_PATH) throw new Error('MOOVX_BASELINE_RAW_PATH is required')

test.setTimeout(8 * 60_000)

function installVitalObservers(page: Page) {
  return page.addInitScript(({ diagnosticsEnabled }) => {
    let lcp: number | null = null
    let cls = 0
    let inp: number | null = null
    let interactionCount = 0
    let step = 'navigation'
    let thermalState: 'cold' | 'warm' = 'cold'
    let lcpEntry: LcpDiagnostic | null = null
    let interactions: InteractionDiagnostic[] = []
    let longTasks: LongTaskDiagnostic[] = []
    const targetCode = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return 'unknown'
      const mobileButton = target.closest('nav.mobile-nav button')
      if (mobileButton) {
        const buttons = [...(mobileButton.parentElement?.querySelectorAll(':scope > button') ?? [])]
        return `mobile-nav:${Math.max(0, buttons.indexOf(mobileButton))}`
      }
      const tag = target.tagName.toLowerCase()
      const role = target.getAttribute('role')
      const type = target instanceof HTMLButtonElement ? target.type : null
      return [tag, role && `role:${role}`, type && `type:${type}`].filter(Boolean).join(':')
    }
    const observe = (type: string, callback: (entry: PerformanceEntry) => void) => {
      try {
        const observer = new PerformanceObserver(list => list.getEntries().forEach(callback))
        const options: PerformanceObserverInit & { durationThreshold?: number } = { type, buffered: true }
        if (type === 'event') options.durationThreshold = 0
        observer.observe(options)
      } catch { /* unsupported metrics remain explicit */ }
    }
    observe('largest-contentful-paint', entry => {
      const candidate = entry as PerformanceEntry & { element?: Element | null }
      lcp = entry.startTime
      if (diagnosticsEnabled) lcpEntry = { startTime: entry.startTime, targetCode: targetCode(candidate.element ?? null), step }
    })
    observe('layout-shift', entry => {
      const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
      if (!shift.hadRecentInput) cls += shift.value
    })
    observe('event', entry => {
      const event = entry as PerformanceEntry & { duration: number; interactionId: number }
      if (event.interactionId > 0) {
        interactionCount += 1
        inp = Math.max(inp ?? 0, event.duration)
        if (diagnosticsEnabled) interactions = [...interactions, {
          interactionId: event.interactionId,
          eventType: entry.name,
          duration: event.duration,
          startTime: event.startTime,
          targetCode: targetCode((event as PerformanceEntry & { target?: EventTarget | null }).target ?? null),
          step,
          thermalState,
          javascriptRequestedInStep: false,
        }].slice(-100)
      }
    })
    if (diagnosticsEnabled) observe('longtask', entry => {
      longTasks = [...longTasks, { duration: entry.duration, startTime: entry.startTime, step }].slice(-100)
    })
    window.__moovxBaseline = {
      reset: () => {
        lcp = null; cls = 0; inp = null; interactionCount = 0
        lcpEntry = null; interactions = []; longTasks = []
      },
      setContext: (nextStep, nextThermalState) => { step = nextStep; thermalState = nextThermalState },
      snapshot: () => ({
        lcp, cls, inp, interactionCount, interactions, longTasks, lcpEntry,
        eventTimingSupported: PerformanceObserver.supportedEntryTypes.includes('event'),
      }),
    }
  }, { diagnosticsEnabled: DIAGNOSTICS_ENABLED })
}

function createRequestRecorder(page: Page) {
  let current: RequestSample[] = []
  const external = new Set<string>()
  const record = (rawUrl: string, resourceType: string) => {
    const url = new URL(rawUrl)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return
    if (!LOCAL_HOSTS.has(url.hostname)) { external.add(url.origin); return }
    current.push({ category: classifyLocalRequest(rawUrl, resourceType), resourceType })
  }
  page.on('request', (request: Request) => record(request.url(), request.resourceType()))
  page.on('websocket', socket => record(socket.url(), 'websocket'))
  return {
    reset: () => { current = [] },
    finish: (name: string): StepResult => {
      expect([...external], 'external network origins').toEqual([])
      const result = { name, requests: summarizeRequests(current) }
      current = []
      return result
    },
  }
}

async function newMeasuredPage(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, timezoneId: 'Europe/Zurich', serviceWorkers: 'block' })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !LOCAL_HOSTS.has(url.hostname)) return route.abort('blockedbyclient')
    return route.continue()
  })
  const page = await context.newPage()
  await installVitalObservers(page)
  return { context, page, recorder: createRequestRecorder(page) }
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1_000)
}

async function snapshot(page: Page): Promise<VitalSnapshot> {
  return page.evaluate(() => window.__moovxBaseline.snapshot())
}

async function setMeasurementContext(page: Page, step: string, pass: number) {
  await page.evaluate(({ nextStep, thermalState }) => {
    window.__moovxBaseline.setContext(nextStep, thermalState)
  }, { nextStep: step, thermalState: pass === 1 ? 'cold' as const : 'warm' as const })
}

function annotateChunkWindows(vitals: VitalSnapshot, steps: StepResult[]): VitalSnapshot {
  const javascriptByStep = new Map(steps.map(step => [step.name, step.requests.categories.javascript > 0]))
  return {
    ...vitals,
    interactions: vitals.interactions.map(interaction => ({
      ...interaction,
      javascriptRequestedInStep: javascriptByStep.get(interaction.step.split(':').at(-1) ?? '') ?? false,
    })),
  }
}

function aggregateSegments(segments: VitalSnapshot[]): VitalSnapshot {
  const lcpValues = segments.flatMap(segment => segment.lcp === null ? [] : [segment.lcp])
  const inpValues = segments.flatMap(segment => segment.inp === null ? [] : [segment.inp])
  return {
    lcp: lcpValues.length ? Math.max(...lcpValues) : null,
    cls: segments.reduce((sum, segment) => sum + segment.cls, 0),
    inp: inpValues.length ? Math.max(...inpValues) : null,
    interactionCount: segments.reduce((sum, segment) => sum + segment.interactionCount, 0),
    eventTimingSupported: segments.every(segment => segment.eventTimingSupported),
    interactions: segments.flatMap(segment => segment.interactions),
    longTasks: segments.flatMap(segment => segment.longTasks),
    lcpEntry: [...segments].sort((a, b) => (b.lcp ?? -1) - (a.lcp ?? -1))[0]?.lcpEntry ?? null,
  }
}

function aggregateStepRequests(steps: StepResult[]): RequestSummary {
  const categories = Object.fromEntries(REQUEST_CATEGORIES.map(category => [category, steps.reduce((sum, step) => sum + step.requests.categories[category], 0)])) as RequestSummary['categories']
  return { total: steps.reduce((sum, step) => sum + step.requests.total, 0), application: steps.reduce((sum, step) => sum + step.requests.application, 0), categories }
}

async function measureClientPass(browser: Browser, fixture: CoachClientFixture, pass: number): Promise<JourneyRun> {
  const { context, page, recorder } = await newMeasuredPage(browser, { width: 390, height: 844 })
  try {
    await loginLocalPersona(page, fixture.client)
    recorder.reset()
    await page.goto('/')
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    await settle(page)
    const steps = [recorder.finish('home')]

    recorder.reset()
    await setMeasurementContext(page, 'client:training', pass)
    await page.locator('nav.mobile-nav button').nth(1).click()
    await expect(page.getByText(/MES PROGRAMMES/i).first()).toBeVisible()
    await settle(page)
    steps.push(recorder.finish('training'))

    recorder.reset()
    await setMeasurementContext(page, 'client:nutrition', pass)
    await page.locator('nav.mobile-nav button').nth(2).click()
    await expect(page.getByText(/JOURNAL|PLAN/i).first()).toBeVisible()
    await settle(page)
    steps.push(recorder.finish('nutrition'))
    const segments = [annotateChunkWindows(await snapshot(page), steps)]
    return { pass, vitals: aggregateSegments(segments), segments, steps, requests: aggregateStepRequests(steps) }
  } finally { await context.close() }
}

async function measureCoachPass(browser: Browser, fixture: CoachClientFixture, pass: number): Promise<JourneyRun> {
  const { context, page, recorder } = await newMeasuredPage(browser, { width: 1440, height: 900 })
  try {
    await loginLocalPersona(page, fixture.coach, '/coach')
    recorder.reset()
    await page.goto('/coach')
    await expect(page.getByText(/COACH PRO/).first()).toBeVisible({ timeout: 25_000 })
    await settle(page)
    const steps = [recorder.finish('home')]

    recorder.reset()
    await setMeasurementContext(page, 'coach:clients', pass)
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await expect(page.getByText('Client Parcours').first()).toBeVisible()
    await settle(page)
    steps.push(recorder.finish('clients'))

    recorder.reset()
    await setMeasurementContext(page, 'coach:messages', pass)
    await page.getByRole('button', { name: 'Messages', exact: true }).first().click()
    await settle(page)
    steps.push(recorder.finish('messages'))
    const coachSegment = annotateChunkWindows(await snapshot(page), steps)

    recorder.reset()
    await setMeasurementContext(page, 'coach:client-detail', pass)
    await page.getByRole('button', { name: /Clients|Dashboard/i }).first().click()
    await page.getByText('Client Parcours').first().click()
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/client/${fixture.client.id}`)
    await expect(page.getByText('FICHE CLIENT')).toBeVisible()
    await page.getByRole('button', { name: 'Aperçu', exact: true }).first().click()
    await settle(page)
    steps.push(recorder.finish('client-detail'))
    const segments = [coachSegment, annotateChunkWindows(await snapshot(page), steps)]
    return { pass, vitals: aggregateSegments(segments), segments, steps, requests: aggregateStepRequests(steps) }
  } finally { await context.close() }
}

function summarizeJourney(runs: JourneyRun[]) {
  const available = (key: 'lcp' | 'inp') => runs.flatMap(run => run.vitals[key] === null ? [] : [run.vitals[key] as number])
  return {
    lcp: available('lcp').length === runs.length ? summarizeNumbers(available('lcp')) : { unavailable: 'PerformanceObserver did not expose LCP for every pass' },
    cls: summarizeNumbers(runs.map(run => run.vitals.cls)),
    inp: available('inp').length === runs.length ? summarizeNumbers(available('inp')) : { unavailable: runs.every(run => run.vitals.eventTimingSupported) ? 'PerformanceEventTiming exposed event entries but no interactionId for every pass' : 'PerformanceObserver does not support PerformanceEventTiming in this browser' },
    requests: {
      total: summarizeNumbers(runs.map(run => run.requests.total)),
      application: summarizeNumbers(runs.map(run => run.requests.application)),
      categories: Object.fromEntries(REQUEST_CATEGORIES.map(category => [category, summarizeNumbers(runs.map(run => run.requests.categories[category]))])),
    },
  }
}

test('captures three independent production journeys without external requests', async ({ browser }) => {
  expect(APP_URL.hostname).toBe('127.0.0.1')
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    const client: JourneyRun[] = []
    const coach: JourneyRun[] = []
    for (let pass = 1; pass <= 3; pass += 1) client.push(await measureClientPass(browser, fixture, pass))
    for (let pass = 1; pass <= 3; pass += 1) coach.push(await measureCoachPass(browser, fixture, pass))
    const output = {
      browser: browser.version(),
      journeys: {
        clientMobile: { runs: client, aggregate: summarizeJourney(client) },
        coachDesktop: { runs: coach, aggregate: summarizeJourney(coach) },
      },
    }
    mkdirSync(dirname(RAW_PATH), { recursive: true })
    writeFileSync(RAW_PATH, stableJson(output), { mode: 0o600 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
