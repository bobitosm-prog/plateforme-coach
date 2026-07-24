import { expect, test, type Browser, type Page, type Request } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { classifyLocalRequest, REQUEST_CATEGORIES, stableJson, summarizeNumbers, summarizeRequests, type RequestSample, type RequestSummary } from '../lib/performance/baseline'
import { LOCAL_EXERCISE_VIDEO_POSTERS } from '../lib/media/exercise-video-posters'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import { assertNoSyntheticCoachClientRows, buildCoachClientFixture, cleanupCoachClientFixture, loginLocalPersona, seedCoachClientFixture, type CoachClientFixture } from './helpers/coach-client-fixtures'

type InteractionDiagnostic = {
  interactionId: number
  eventType: string
  duration: number
  startTime: number
  inputDelay: number
  processingDuration: number
  presentationDelay: number | null
  targetCode: string
  step: string
  thermalState: 'cold' | 'warm'
  javascriptRequestedInStep: boolean
  domBefore: MediaDomDiagnostic
  domAfter: MediaDomDiagnostic
  associatedLongTasks: LongTaskDiagnostic[]
  associatedLongAnimationFrames: LongAnimationFrameDiagnostic[]
  associatedResources: ResourceDiagnostic[]
}
type LongTaskDiagnostic = { duration: number; startTime: number; step: string }
type LongAnimationFrameDiagnostic = {
  duration: number
  blockingDuration: number
  renderDuration: number | null
  styleAndLayoutDuration: number | null
  scriptDuration: number
  startTime: number
  step: string
}
type MediaDomDiagnostic = { videos: number; posterAttributes: number; posterImages: number }
type ResourceDiagnostic = {
  kind: 'image' | 'javascript'
  resourceCode: string
  startTime: number
  duration: number
  transferSize: number
  poster: boolean
  step: string
}
type LcpDiagnostic = { startTime: number; targetCode: string; step: string }
type VitalSnapshot = {
  lcp: number | null
  cls: number
  inp: number | null
  interactionCount: number
  eventTimingSupported: boolean
  interactions: InteractionDiagnostic[]
  longTasks: LongTaskDiagnostic[]
  longAnimationFrames: LongAnimationFrameDiagnostic[]
  resources: ResourceDiagnostic[]
  imageDecodeObservable: false
  reactCommitsObservable: false
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
const POSTER_REQUEST_MODE = process.env.MOOVX_POSTER_REQUEST_MODE ?? 'normal'
const POSTER_CACHE_STATE = process.env.MOOVX_POSTER_CACHE_STATE ?? 'cold'
const INP_EXPERIMENT = process.env.MOOVX_INP_EXPERIMENT ?? 'normative'
const PRELOAD_CHUNKS = process.env.MOOVX_PRELOAD_CHUNKS
  ? JSON.parse(process.env.MOOVX_PRELOAD_CHUNKS) as string[]
  : []
const DIAGNOSTIC_CLIENT_ONLY = process.env.MOOVX_DIAGNOSTIC_CLIENT_ONLY === '1'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

if (!RAW_PATH) throw new Error('MOOVX_BASELINE_RAW_PATH is required')
if (!['normal', 'block'].includes(POSTER_REQUEST_MODE)) throw new Error('MOOVX_POSTER_REQUEST_MODE must be normal or block')
if (!['cold', 'hot'].includes(POSTER_CACHE_STATE)) throw new Error('MOOVX_POSTER_CACHE_STATE must be cold or hot')
if (!['normative', 'canonical', 'preload-chunks', 'cache-hot', 'block-images', 'trace'].includes(INP_EXPERIMENT)) {
  throw new Error('Unsupported MOOVX_INP_EXPERIMENT')
}
if (!Array.isArray(PRELOAD_CHUNKS) || PRELOAD_CHUNKS.some(path => typeof path !== 'string' || !path.startsWith('/_next/static/chunks/'))) {
  throw new Error('MOOVX_PRELOAD_CHUNKS must contain local Next.js chunk paths')
}

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
    let longAnimationFrames: LongAnimationFrameDiagnostic[] = []
    let resources: ResourceDiagnostic[] = []
    let domBefore: MediaDomDiagnostic = { videos: 0, posterAttributes: 0, posterImages: 0 }
    const mediaDom = (): MediaDomDiagnostic => ({
      videos: document.querySelectorAll('video').length,
      posterAttributes: document.querySelectorAll('video[poster]').length,
      posterImages: document.querySelectorAll('img[src*="/images/video-posters/"]').length,
    })
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
      const event = entry as PerformanceEntry & {
        duration: number
        interactionId: number
        processingStart: number
        processingEnd: number
      }
      if (event.interactionId > 0) {
        interactionCount += 1
        inp = Math.max(inp ?? 0, event.duration)
        if (diagnosticsEnabled) interactions = [...interactions, {
          interactionId: event.interactionId,
          eventType: entry.name,
          duration: event.duration,
          startTime: event.startTime,
          inputDelay: Math.max(0, event.processingStart - event.startTime),
          processingDuration: Math.max(0, event.processingEnd - event.processingStart),
          presentationDelay: Number.isFinite(event.duration)
            ? Math.max(0, event.startTime + event.duration - event.processingEnd)
            : null,
          targetCode: targetCode((event as PerformanceEntry & { target?: EventTarget | null }).target ?? null),
          step,
          thermalState,
          javascriptRequestedInStep: false,
          domBefore,
          domAfter: mediaDom(),
          associatedLongTasks: [],
          associatedLongAnimationFrames: [],
          associatedResources: [],
        }].slice(-100)
      }
    })
    if (diagnosticsEnabled) observe('longtask', entry => {
      longTasks = [...longTasks, { duration: entry.duration, startTime: entry.startTime, step }].slice(-100)
    })
    if (diagnosticsEnabled) observe('long-animation-frame', entry => {
      const frame = entry as PerformanceEntry & {
        blockingDuration?: number
        renderStart?: number
        styleAndLayoutStart?: number
        scripts?: Array<{ duration?: number }>
      }
      const end = entry.startTime + entry.duration
      longAnimationFrames = [...longAnimationFrames, {
        duration: entry.duration,
        blockingDuration: frame.blockingDuration ?? 0,
        renderDuration: typeof frame.renderStart === 'number' && frame.renderStart > 0
          ? Math.max(0, end - frame.renderStart)
          : null,
        styleAndLayoutDuration: typeof frame.styleAndLayoutStart === 'number' && frame.styleAndLayoutStart > 0
          ? Math.max(0, end - frame.styleAndLayoutStart)
          : null,
        scriptDuration: (frame.scripts ?? []).reduce((total, script) => total + (script.duration ?? 0), 0),
        startTime: entry.startTime,
        step,
      }].slice(-100)
    })
    if (diagnosticsEnabled) observe('resource', entry => {
      const resource = entry as PerformanceResourceTiming
      const kind: ResourceDiagnostic['kind'] | null = resource.initiatorType === 'script'
        ? 'javascript'
        : ['img', 'image', 'video'].includes(resource.initiatorType) ? 'image' : null
      if (!kind) return
      const pathname = (() => {
        try { return new URL(resource.name, location.origin).pathname } catch { return '' }
      })()
      resources = [...resources, {
        kind,
        resourceCode: pathname,
        startTime: resource.startTime,
        duration: resource.duration,
        transferSize: resource.transferSize,
        poster: pathname.startsWith('/images/video-posters/'),
        step,
      }].slice(-200)
    })
    window.__moovxBaseline = {
      reset: () => {
        lcp = null; cls = 0; inp = null; interactionCount = 0
        lcpEntry = null; interactions = []; longTasks = []; longAnimationFrames = []; resources = []
      },
      setContext: (nextStep, nextThermalState) => {
        step = nextStep
        thermalState = nextThermalState
        domBefore = mediaDom()
      },
      snapshot: () => {
        const annotatedInteractions = interactions.map(interaction => {
          const windowStart = interaction.startTime
          const windowEnd = interaction.startTime + interaction.duration
          return {
            ...interaction,
            associatedLongTasks: longTasks.filter(task =>
              task.startTime + task.duration >= windowStart && task.startTime <= windowEnd),
            associatedLongAnimationFrames: longAnimationFrames.filter(frame =>
              frame.startTime + frame.duration >= windowStart && frame.startTime <= windowEnd),
            associatedResources: resources.filter(resource =>
              resource.startTime >= windowStart && resource.startTime <= windowEnd),
          }
        })
        return {
          lcp, cls, inp, interactionCount, interactions: annotatedInteractions, longTasks, longAnimationFrames, resources,
          imageDecodeObservable: false as const,
          reactCommitsObservable: false as const,
          lcpEntry,
          eventTimingSupported: PerformanceObserver.supportedEntryTypes.includes('event'),
        }
      },
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
  let blockDiagnosticImages = false
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !LOCAL_HOSTS.has(url.hostname)) return route.abort('blockedbyclient')
    if (POSTER_REQUEST_MODE === 'block' && url.pathname.startsWith('/images/video-posters/')) return route.abort('blockedbyclient')
    if (blockDiagnosticImages && route.request().resourceType() === 'image') return route.abort('blockedbyclient')
    return route.continue()
  })
  const page = await context.newPage()
  await installVitalObservers(page)
  if (POSTER_CACHE_STATE === 'hot') {
    await page.goto(APP_URL.origin)
    await page.evaluate(async posterPaths => {
      await Promise.all(posterPaths.map(path => new Promise<void>(resolve => {
        const image = new Image()
        image.onload = image.onerror = () => resolve()
        image.src = path
      })))
    }, Object.values(LOCAL_EXERCISE_VIDEO_POSTERS))
  }
  return {
    context,
    page,
    recorder: createRequestRecorder(page),
    setDiagnosticImageBlocking: (enabled: boolean) => { blockDiagnosticImages = enabled },
  }
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
    longAnimationFrames: segments.flatMap(segment => segment.longAnimationFrames),
    resources: segments.flatMap(segment => segment.resources),
    imageDecodeObservable: false,
    reactCommitsObservable: false,
    lcpEntry: [...segments].sort((a, b) => (b.lcp ?? -1) - (a.lcp ?? -1))[0]?.lcpEntry ?? null,
  }
}

function aggregateStepRequests(steps: StepResult[]): RequestSummary {
  const categories = Object.fromEntries(REQUEST_CATEGORIES.map(category => [category, steps.reduce((sum, step) => sum + step.requests.categories[category], 0)])) as RequestSummary['categories']
  return { total: steps.reduce((sum, step) => sum + step.requests.total, 0), application: steps.reduce((sum, step) => sum + step.requests.application, 0), categories }
}

async function measureClientPass(browser: Browser, fixture: CoachClientFixture, pass: number): Promise<JourneyRun> {
  const { context, page, recorder, setDiagnosticImageBlocking } = await newMeasuredPage(browser, { width: 390, height: 844 })
  try {
    await loginLocalPersona(page, fixture.client)
    recorder.reset()
    await page.goto('/')
    await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible({ timeout: 25_000 })
    await settle(page)
    const steps = [recorder.finish('home')]

    if (INP_EXPERIMENT === 'preload-chunks') {
      await page.evaluate(async paths => {
        await Promise.all(paths.map(path => new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = path
          script.onload = () => { script.remove(); resolve() }
          script.onerror = () => reject(new Error('Diagnostic chunk preload failed'))
          document.head.append(script)
        })))
      }, PRELOAD_CHUNKS)
      recorder.reset()
    }
    if (INP_EXPERIMENT === 'cache-hot') {
      await page.locator('nav.mobile-nav button').nth(1).click()
      await expect(page.getByText(/MES PROGRAMMES/i).first()).toBeVisible()
      await settle(page)
      await page.locator('nav.mobile-nav button').nth(0).click()
      await expect(page.getByText('SÉANCE DU JOUR').first()).toBeVisible()
      await settle(page)
      await page.evaluate(() => window.__moovxBaseline.reset())
      recorder.reset()
    }
    if (INP_EXPERIMENT === 'block-images') setDiagnosticImageBlocking(true)

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
    const passCount = DIAGNOSTIC_CLIENT_ONLY ? 1 : 3
    for (let pass = 1; pass <= passCount; pass += 1) client.push(await measureClientPass(browser, fixture, pass))
    if (!DIAGNOSTIC_CLIENT_ONLY) {
      for (let pass = 1; pass <= 3; pass += 1) coach.push(await measureCoachPass(browser, fixture, pass))
    }
    const output = {
      browser: browser.version(),
      diagnosticProtocol: {
        enabled: DIAGNOSTICS_ENABLED,
        posterRequestMode: POSTER_REQUEST_MODE,
        posterCacheState: POSTER_CACHE_STATE,
        imageDecodeObservable: false,
        reactCommitsObservable: false,
        inpExperiment: INP_EXPERIMENT,
        preloadedChunks: PRELOAD_CHUNKS,
        tracingNormative: false,
      },
      journeys: {
        clientMobile: { runs: client, aggregate: summarizeJourney(client) },
        ...(DIAGNOSTIC_CLIENT_ONLY ? {} : { coachDesktop: { runs: coach, aggregate: summarizeJourney(coach) } }),
      },
    }
    mkdirSync(dirname(RAW_PATH), { recursive: true })
    writeFileSync(RAW_PATH, stableJson(output), { mode: 0o600 })
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
