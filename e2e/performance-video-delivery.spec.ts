import { expect, test, type Browser, type Page, type Request, type Response } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  assertNoSyntheticCoachClientRows,
  buildCoachClientFixture,
  cleanupCoachClientFixture,
  loginLocalPersona,
  seedCoachClientFixture,
} from './helpers/coach-client-fixtures'

const EVIDENCE_PATH = process.env.MOOVX_VIDEO_EVIDENCE_PATH
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])
const VIDEO_PATH = '/videos/exercises/arnold-press.mp4'
const POSTER_PATH = '/images/video-posters/arnold-press.webp'

type MediaTransfer = {
  path: string
  status: number
  range: string | null
  contentLength: number | null
  cacheControl: string | null
}

function recordMedia(page: Page) {
  const requests: string[] = []
  const responses: MediaTransfer[] = []
  const external = new Set<string>()
  page.on('request', (request: Request) => {
    const url = new URL(request.url())
    if (!LOCAL_HOSTS.has(url.hostname)) external.add(url.origin)
    if (url.pathname === VIDEO_PATH || url.pathname === POSTER_PATH) requests.push(url.pathname)
  })
  page.on('response', (response: Response) => {
    const url = new URL(response.url())
    if (url.pathname !== VIDEO_PATH && url.pathname !== POSTER_PATH) return
    const headers = response.headers()
    const contentLength = Number(headers['content-length'])
    responses.push({
      path: url.pathname,
      status: response.status(),
      range: response.request().headers()['range'] ?? null,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      cacheControl: headers['cache-control'] ?? null,
    })
  })
  return {
    snapshot: () => ({ requests: [...requests], responses: [...responses] }),
    clear: () => { requests.length = 0; responses.length = 0 },
    assertLocal: () => expect([...external]).toEqual([]),
  }
}

async function selectTraining(page: Page, width: number) {
  if (width < 768) await page.locator('nav.mobile-nav button').nth(1).click()
  else await page.getByRole('button', { name: /Entrainement|Entraînement|Training/i }).first().click()
  await expect(page.getByPlaceholder(/Rechercher un exercice/i)).toBeVisible({ timeout: 25_000 })
}

async function collectResourceSizes(page: Page) {
  return page.evaluate(({ videoPath, posterPath }) => performance.getEntriesByType('resource')
    .filter(entry => {
      const path = new URL(entry.name).pathname
      return path === videoPath || path === posterPath
    })
    .map(entry => {
      const resource = entry as PerformanceResourceTiming
      return {
        path: new URL(resource.name).pathname,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
      }
    }), { videoPath: VIDEO_PATH, posterPath: POSTER_PATH })
}

async function runLibraryJourney(
  browser: Browser,
  email: string,
  exerciseName: string,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({
    viewport,
  })
  const page = await context.newPage()
  const recorder = recordMedia(page)
  try {
    await loginLocalPersona(page, { id: '', email, role: 'client', subscriptionType: null, subscriptionStatus: null, onboardingCompleted: true, admin: false })
    await page.goto('/')
    await selectTraining(page, viewport.width)
    await page.evaluate(() => performance.clearResourceTimings())
    recorder.clear()
    await page.waitForTimeout(750)
    const beforeOpen = recorder.snapshot()
    expect(beforeOpen.requests).toEqual([])

    const search = page.getByPlaceholder(/Rechercher un exercice/i)
    await search.fill(exerciseName)
    const exercise = page.getByRole('button', { name: new RegExp(exerciseName, 'i') }).first()
    await expect(exercise).toBeVisible()
    await exercise.click()
    await expect(page.locator('video[data-video-state]').first()).toBeVisible()
    await expect.poll(() => recorder.snapshot().requests.includes(VIDEO_PATH)).toBe(true)
    await expect.poll(() => recorder.snapshot().responses.some(response => response.path === VIDEO_PATH)).toBe(true)
    const firstOpen = recorder.snapshot()
    const firstSizes = await collectResourceSizes(page)
    expect(firstOpen.requests).toContain(POSTER_PATH)
    expect(firstOpen.requests).toContain(VIDEO_PATH)

    await page.getByRole('button', { name: /Fermer|Close|Schließen/i }).last().click()
    await expect(page.locator('video[data-video-state]')).toHaveCount(0)
    recorder.clear()
    await page.waitForTimeout(750)
    const afterClose = recorder.snapshot()
    expect(afterClose.requests).toEqual([])

    await exercise.click()
    await expect(page.locator('video[data-video-state]').first()).toBeVisible()
    await page.waitForTimeout(750)
    const reopen = recorder.snapshot()
    const reopenSizes = await collectResourceSizes(page)
    const firstVideoBytes = firstOpen.responses
      .filter(response => response.path === VIDEO_PATH)
      .reduce((sum, response) => sum + (response.contentLength ?? 0), 0)
    const reopenedVideoBytes = reopen.responses
      .filter(response => response.path === VIDEO_PATH)
      .reduce((sum, response) => sum + (response.contentLength ?? 0), 0)
    const videoIsCacheable = firstOpen.responses
      .filter(response => response.path === VIDEO_PATH)
      .some(response => /(?:immutable|max-age=[1-9]\d*)/i.test(response.cacheControl ?? ''))
    if (videoIsCacheable) expect(reopenedVideoBytes).toBeLessThanOrEqual(firstVideoBytes)
    recorder.assertLocal()
    return { beforeOpen, firstOpen, firstSizes, afterClose, reopen, reopenSizes }
  } finally {
    await context.close()
  }
}

test.setTimeout(180_000)

test('exercise video is deferred and cleaned up on mobile and desktop', async ({ browser }) => {
  const admin = createLocalAdminClient({
    url: process.env.API_URL!,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
    mode: 'e2e',
  })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    const exercise = await admin.from('exercises_db').select('id,name,video_url').like('video_url', `${VIDEO_PATH}%`).limit(1).single()
    expect(exercise.error).toBeNull()
    expect(exercise.data?.name).toMatch(/Arnold/i)
    const programUpdate = await admin.from('client_programs').update({
      program: {
        lundi: {
          nom: 'Force locale',
          repos: false,
          exercises: [{ name: exercise.data!.name, sets: 3, reps: 8, rest: 90 }],
        },
      },
    }).eq('client_id', fixture.client.id)
    expect(programUpdate.error).toBeNull()
    const mobile = await runLibraryJourney(browser, fixture.client.email, exercise.data!.name, { width: 390, height: 844 })
    const desktop = await runLibraryJourney(browser, fixture.client.email, exercise.data!.name, { width: 1024, height: 768 })
    if (EVIDENCE_PATH) {
      writeFileSync(EVIDENCE_PATH, `${JSON.stringify({
        schemaVersion: 1,
        media: { videoPath: VIDEO_PATH, posterPath: POSTER_PATH },
        mobile,
        desktop,
      }, null, 2)}\n`, { mode: 0o600 })
    }
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
