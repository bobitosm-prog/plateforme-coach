import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  from: vi.fn(),
  checkRateLimit: vi.fn(),
  checkAiQuota: vi.fn(),
  generateWeeklyDiagnostic: vi.fn(),
  startAiUsage: vi.fn(),
  finalizeUsage: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: mocks.from })),
  createSupabaseRouteClient: vi.fn(async () => ({ from: mocks.from })),
}))
vi.mock('@/lib/repositories/identity', () => ({
  createIdentityRepository: () => ({ getCurrent: mocks.identity }),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  checkAiQuota: mocks.checkAiQuota,
  aiRateLimitResponse: (limit: number, resetIn: number) => Response.json(
    { error: 'Limite IA atteinte', limit, resetIn },
    { status: 429 },
  ),
}))
vi.mock('@/lib/weekly-diagnostic/generator', () => ({
  generateWeeklyDiagnostic: mocks.generateWeeklyDiagnostic,
}))
vi.mock('@/lib/ai/usage', () => ({
  aiUsageCorrelationId: () => 'request-test',
  startAiUsage: mocks.startAiUsage,
}))

import { GET as readFeedback } from '../../app/api/feedback/mine/route'
import { POST as markFeedbackRead } from '../../app/api/feedback/mark-all-read/route'
import { POST as recordVitals } from '../../app/api/vitals/route'
import { POST as weeklyDiagnostic } from '../../app/api/weekly-diagnostic/route'
import { clientLogSchema } from '../../app/api/log-error/schema'
import { updateLocaleSchema } from '../../app/api/user/locale/schema'
import { webVitalSchema } from '../../app/api/vitals/schema'

const routeRequest = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.identity.mockResolvedValue({
    ok: true,
    kind: 'authenticated',
    data: { id: 'session-user', email: 'person@example.test' },
  })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.startAiUsage.mockResolvedValue({ status: 'started', tracker: { finalize: mocks.finalizeUsage }, remaining: null })
})

describe('simple API schemas', () => {
  it('keeps locale strict while tolerating unrelated legacy keys', () => {
    expect(updateLocaleSchema.parse({ locale: 'de', legacy: true })).toMatchObject({ locale: 'de' })
    expect(updateLocaleSchema.safeParse({ locale: 'it' }).success).toBe(false)
  })

  it('bounds vitals and requires a finite value', () => {
    expect(webVitalSchema.safeParse({ name: 'LCP', value: 123.4 }).success).toBe(true)
    expect(webVitalSchema.safeParse({ name: 'LCP', value: Number.NaN }).success).toBe(false)
    expect(webVitalSchema.safeParse({ name: '', value: 1 }).success).toBe(false)
  })

  it('requires a truthy log message while leaving normalization to the service', () => {
    expect(clientLogSchema.safeParse({ message: 'synthetic', user_id: 'forged' }).success).toBe(true)
    expect(clientLogSchema.safeParse({ message: '' }).success).toBe(false)
  })
})

describe('feedback routes', () => {
  it('reads only the session user reports and preserves the legacy response', async () => {
    const reports = [
      { id: 'one', admin_reply: 'reply', read_by_user: false },
      { id: 'two', admin_reply: null, read_by_user: false },
    ]
    const order = vi.fn().mockResolvedValue({ data: reports, error: null })
    const eq = vi.fn(() => ({ order }))
    mocks.from.mockReturnValue({ select: vi.fn(() => ({ eq })) })

    const response = await readFeedback(routeRequest('/api/feedback/mine'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reports, count: 2, unreadCount: 1 })
    expect(eq).toHaveBeenCalledWith('user_id', 'session-user')
  })

  it('marks only session-owned unread answered reports', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'one' }], error: null })
    const not = vi.fn(() => ({ select }))
    const secondEq = vi.fn(() => ({ not }))
    const firstEq = vi.fn(() => ({ eq: secondEq }))
    const update = vi.fn(() => ({ eq: firstEq }))
    mocks.from.mockReturnValue({ update })

    const response = await markFeedbackRead(routeRequest('/api/feedback/mark-all-read', { method: 'POST' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, markedCount: 1 })
    expect(firstEq).toHaveBeenCalledWith('user_id', 'session-user')
    expect(secondEq).toHaveBeenCalledWith('read_by_user', false)
    expect(not).toHaveBeenCalledWith('admin_reply', 'is', null)
  })

  it('keeps anonymous feedback access rejected', async () => {
    mocks.identity.mockResolvedValue({ ok: false, kind: 'anonymous' })
    expect((await readFeedback(routeRequest('/api/feedback/mine'))).status).toBe(401)
    expect((await markFeedbackRead(routeRequest('/api/feedback/mark-all-read', { method: 'POST' }))).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

describe('vitals route', () => {
  it('keeps the bodyless 204 response and rounded log value', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const request = new Request('http://localhost/api/vitals', {
      method: 'POST',
      body: JSON.stringify({ name: 'LCP', value: 123.6, id: 'synthetic', path: '/test' }),
    })
    const response = await recordVitals(request as never)
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    const record = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]))
    expect(record).toMatchObject({
      event: 'WEB_VITAL_REQUEST', outcome: 'success', reason: 'COMPLETED',
      context: { metric: 'LCP', value: 124 },
    })
    expect(JSON.stringify(record)).not.toContain('/test')
    consoleSpy.mockRestore()
  })

  it('keeps malformed metrics as a bodyless 400', async () => {
    const response = await recordVitals(new Request('http://localhost/api/vitals', {
      method: 'POST', body: JSON.stringify({ name: '', value: 1 }),
    }) as never)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('')
  })
})

describe('weekly diagnostic route', () => {
  it('derives the user from the server session and preserves success', async () => {
    mocks.generateWeeklyDiagnostic.mockResolvedValue({ diagnostic_id: 'diag-one', diagnostic: { score: 8 } })
    const response = await weeklyDiagnostic(new Request('http://localhost/api/weekly-diagnostic', {
      method: 'POST', headers: { 'x-forwarded-for': '127.0.0.1' },
    }) as never)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ diagnostic_id: 'diag-one', diagnostic: { score: 8 } })
    expect(mocks.generateWeeklyDiagnostic).toHaveBeenCalledWith('session-user', expect.anything())
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({ feature: 'weekly-diagnostic', principal: { kind: 'user', id: 'session-user' } }))
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'succeeded' }))
  })

  it('preserves route and AI rate-limit statuses', async () => {
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await weeklyDiagnostic(new Request('http://localhost') as never)).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    const response = await weeklyDiagnostic(new Request('http://localhost') as never)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: 'Service temporairement indisponible' })
  })
})
