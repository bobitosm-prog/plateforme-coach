import { expect, test, type Page, type Request, type WebSocket } from '@playwright/test'
import { createRunSuffix } from '../tests/fixtures/personas'
import { createLocalAdminClient } from '../tests/fixtures/supabase'
import {
  COACH_CLIENT_PASSWORD,
  assertNoSyntheticCoachClientRows,
  buildCoachClientFixture,
  cleanupCoachClientFixture,
  seedCoachClientFixture,
} from './helpers/coach-client-fixtures'

type RequestKind = 'auth' | 'postgrest' | 'realtime' | 'next-internal' | 'other-local'

type DataRequest = {
  kind: RequestKind
  endpoint: string
  method: string
}

const RUN_COUNT = 3
const BASELINE_INITIAL_DATA_REQUESTS = 33
const REQUIRED_REDUCTION = 0.2
const QUIET_WINDOW_MS = 1_000
const STABILITY_TIMEOUT_MS = 25_000

function classifyRequest(request: Request, appUrl: URL, supabaseUrl: URL): DataRequest | null {
  if (!['fetch', 'xhr', 'websocket'].includes(request.resourceType())) return null
  const url = new URL(request.url())
  const isApp = url.origin === appUrl.origin
  const isSupabase = url.origin === supabaseUrl.origin
  if (!isApp && !isSupabase) return null
  if (isApp && url.pathname.startsWith('/_next/')) return null

  let kind: RequestKind = 'other-local'
  let endpoint = url.pathname
  if (isSupabase && url.pathname.startsWith('/auth/v1/')) kind = 'auth'
  else if (isSupabase && url.pathname.startsWith('/rest/v1/')) {
    kind = 'postgrest'
    endpoint = url.pathname.replace('/rest/v1/', '') || '/'
  } else if (isSupabase && url.pathname.startsWith('/realtime/v1/')) kind = 'realtime'
  else if (isApp && url.pathname.startsWith('/api/')) kind = 'next-internal'

  return { kind, endpoint, method: request.method() }
}

async function waitForDataQuiet(requests: readonly DataRequest[]): Promise<void> {
  let previousCount = -1
  let stableSince = Date.now()
  await expect.poll(() => {
    if (requests.length !== previousCount) {
      previousCount = requests.length
      stableSince = Date.now()
    }
    return Date.now() - stableSince
  }, { timeout: STABILITY_TIMEOUT_MS, intervals: [100, 200, 300] }).toBeGreaterThanOrEqual(QUIET_WINDOW_MS)
}

async function measureInitialCoachRequests(page: Page, coach: { email: string }): Promise<DataRequest[]> {
  const appUrl = new URL(process.env.MOOVX_E2E_APP_URL || 'http://127.0.0.1:3210')
  const supabaseUrl = new URL(process.env.API_URL!)
  await page.goto('/login?next=%2Fcoach')
  await page.locator('input[type="email"]').fill(coach.email)
  await page.locator('input[type="password"]').fill(COACH_CLIENT_PASSWORD)

  const requests: DataRequest[] = []
  const listener = (request: Request) => {
    const classified = classifyRequest(request, appUrl, supabaseUrl)
    if (classified) requests.push(classified)
  }
  const websocketListener = (socket: WebSocket) => {
    const url = new URL(socket.url())
    if (url.host === supabaseUrl.host && url.pathname.startsWith('/realtime/v1/')) requests.push({ kind: 'realtime', endpoint: url.pathname, method: 'WS' })
  }
  page.on('request', listener)
  page.on('websocket', websocketListener)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: STABILITY_TIMEOUT_MS }).toBe('/coach')
  await expect(page.getByText(/COACH PRO/).first()).toBeVisible({ timeout: STABILITY_TIMEOUT_MS })
  await waitForDataQuiet(requests)
  page.off('request', listener)
  page.off('websocket', websocketListener)
  return requests
}

test.setTimeout(180_000)

test('coach initial dashboard data requests are measured over three local runs', async ({ browser }) => {
  const admin = createLocalAdminClient({ url: process.env.API_URL!, serviceRoleKey: process.env.SERVICE_ROLE_KEY!, mode: 'e2e' })
  const fixture = buildCoachClientFixture(createRunSuffix())
  await seedCoachClientFixture(admin, fixture)
  try {
    const runs: DataRequest[][] = []
    for (let index = 0; index < RUN_COUNT; index += 1) {
      const context = await browser.newContext()
      const page = await context.newPage()
      runs.push(await measureInitialCoachRequests(page, fixture.coach))
      if (index === 0) {
        let detailedMessageLoads = 0
        const listener = (request: Request) => {
          const url = new URL(request.url())
          if (request.method() === 'GET' && url.pathname === '/rest/v1/messages') detailedMessageLoads += 1
        }
        page.on('request', listener)
        await page.getByRole('button', { name: /Messagerie|Messages/i }).first().click()
        await expect.poll(() => detailedMessageLoads).toBe(1)
        await page.getByRole('button', { name: /Accueil|Home/i }).first().click()
        await page.getByRole('button', { name: /Messagerie|Messages/i }).first().click()
        await expect.poll(() => detailedMessageLoads).toBe(1)
        page.off('request', listener)
      }
      await context.close()
    }

    const report = runs.map((requests, index) => ({
      run: index + 1,
      total: requests.length,
      byKind: Object.fromEntries(['auth', 'postgrest', 'realtime', 'next-internal', 'other-local'].map(kind => [kind, requests.filter(request => request.kind === kind).length])),
      endpoints: Object.fromEntries([...new Set(requests.map(request => `${request.method} ${request.endpoint}`))].sort().map(endpoint => [endpoint, requests.filter(request => `${request.method} ${request.endpoint}` === endpoint).length])),
    }))
    console.log(`COACH_INITIAL_REQUESTS_REPORT ${JSON.stringify(report)}`)
    expect(runs).toHaveLength(RUN_COUNT)
    expect(runs.every(run => run.some(request => request.kind === 'postgrest'))).toBe(true)
    const maximumAllowed = Math.floor(BASELINE_INITIAL_DATA_REQUESTS * (1 - REQUIRED_REDUCTION))
    expect(report.every(run => run.total <= maximumAllowed)).toBe(true)
  } finally {
    await cleanupCoachClientFixture(admin, fixture.ids)
    await assertNoSyntheticCoachClientRows(admin, fixture.ids)
  }
})
