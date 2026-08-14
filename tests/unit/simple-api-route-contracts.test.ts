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
  writeWeeklyDiagnosticPerformanceEvent: (event: unknown) => console.info(JSON.stringify(event)),
}))
vi.mock('@/lib/ai/usage', () => ({
  aiUsageCorrelationId: () => 'request-test',
  startAiUsage: mocks.startAiUsage,
}))

import { GET as readFeedback } from '../../app/api/feedback/mine/route'
import { POST as markFeedbackRead } from '../../app/api/feedback/mark-all-read/route'
import { POST as recordVitals } from '../../app/api/vitals/route'
import { POST as weeklyDiagnostic } from '../../app/api/weekly-diagnostic/route'
import {
  createWeeklyDiagnostic,
  type WeeklyDiagnosticPerformanceEvent,
} from '../../app/api/weekly-diagnostic/service'
import { clientLogSchema } from '../../app/api/log-error/schema'
import { updateLocaleSchema } from '../../app/api/user/locale/schema'
import { webVitalSchema } from '../../app/api/vitals/schema'

const routeRequest = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)

const phases = (
  sourceReads: number,
  analysis: number,
  aiProvider: number,
  persistence: number,
) => ({
  source_reads_ms: sourceReads,
  analysis_ms: analysis,
  ai_provider_ms: aiProvider,
  persistence_ms: persistence,
})

function performanceInput(observer: (event: WeeklyDiagnosticPerformanceEvent) => void) {
  const ticks = [0, 100]
  return {
    requestId: 'request-performance-1',
    now: () => ticks.shift() ?? 100,
    observer,
  }
}

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
      { id: 'one', title: 'First report' },
      { id: 'two', title: 'Second report' },
    ]
    const order = vi.fn().mockResolvedValue({ data: reports, error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn((projection: string) => {
      void projection
      return { eq }
    })
    mocks.from.mockReturnValue({ select })

    const response = await readFeedback(routeRequest('/api/feedback/mine'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      reports: reports.map(report => ({
        ...report,
        admin_reply: null,
        replied_at: null,
        replied_by: null,
        read_by_user: null,
      })),
      count: 2,
      unreadCount: 0,
    })
    expect(eq).toHaveBeenCalledWith('user_id', 'session-user')
    const projection = String(select.mock.calls[0]?.[0])
    expect(projection).not.toMatch(
      /admin_reply|replied_at|replied_by|read_by_user|admin_notes/,
    )
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
  it('emits exactly one redacted coherent performance event on success', async () => {
    const events: WeeklyDiagnosticPerformanceEvent[] = []
    mocks.generateWeeklyDiagnostic.mockImplementation(async (_userId, _client, context) => {
      context.performance.record(phases(10, 20, 30, 10))
      return { diagnostic_id: 'private-diagnostic-id', diagnostic: { private: 'result' } }
    })

    const result = await createWeeklyDiagnostic({
      ip: '192.0.2.1',
      correlationId: 'private-correlation',
      performance: performanceInput(event => events.push(event)),
    })

    expect(result).toMatchObject({ ok: true })
    expect(events).toEqual([{
      request_id: 'request-performance-1',
      result: 'success',
      reason: 'COMPLETED',
      server_total_ms: 100,
      source_reads_ms: 10,
      analysis_ms: 20,
      ai_provider_ms: 30,
      persistence_ms: 10,
      application_overhead_ms: 30,
    }])
    expect(Object.keys(events[0]).sort()).toEqual([
      'ai_provider_ms', 'analysis_ms', 'application_overhead_ms', 'persistence_ms',
      'reason', 'request_id', 'result', 'server_total_ms', 'source_reads_ms',
    ].sort())
    expect(JSON.stringify(events)).not.toMatch(
      /session-user|private-diagnostic-id|private-correlation|profile|prompt|payload|secret|user_id|diagnostic_id/i,
    )
  })

  it.each([
    ['source', { error: 'Erreur lecture profil', reasonCode: 'profile_read_failed' }, phases(10, 0, 0, 0), 'PROFILE_READ_FAILED'],
    ['AI', { error: 'Erreur IA', reasonCode: 'provider_error' }, phases(10, 20, 30, 0), 'PROVIDER_ERROR'],
    ['persistence', { error: 'Erreur sauvegarde', reasonCode: 'persistence_failed' }, phases(10, 20, 30, 10), 'PERSISTENCE_FAILED'],
  ] as const)('emits bounded phase metrics after a %s error', async (_name, generationResult, recordedPhases, reason) => {
    const events: WeeklyDiagnosticPerformanceEvent[] = []
    mocks.generateWeeklyDiagnostic.mockImplementation(async (_userId, _client, context) => {
      context.performance.record(recordedPhases)
      return generationResult
    })
    const result = await createWeeklyDiagnostic({
      ip: '192.0.2.1',
      correlationId: 'performance-correlation',
      performance: performanceInput(event => events.push(event)),
    })
    expect(result).toMatchObject({ ok: false, code: 'INTERNAL_ERROR' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ result: 'failed', reason, ...recordedPhases })
    expect(events[0].application_overhead_ms).toBe(
      events[0].server_total_ms
        - events[0].source_reads_ms
        - events[0].analysis_ms
        - events[0].ai_provider_ms
        - events[0].persistence_ms,
    )
  })

  it('contains a failing performance observer and preserves the service result', async () => {
    mocks.generateWeeklyDiagnostic.mockImplementation(async (_userId, _client, context) => {
      context.performance.record(phases(10, 10, 10, 10))
      return { diagnostic_id: 'diag-one', diagnostic: { score: 8 } }
    })
    await expect(createWeeklyDiagnostic({
      ip: '192.0.2.1',
      correlationId: 'performance-correlation',
      performance: performanceInput(() => { throw new Error('observer unavailable') }),
    })).resolves.toEqual({ ok: true, data: { diagnostic_id: 'diag-one', diagnostic: { score: 8 } } })
  })

  it('derives the user from the server session and preserves success', async () => {
    mocks.generateWeeklyDiagnostic.mockResolvedValue({ diagnostic_id: 'diag-one', diagnostic: { score: 8 } })
    const response = await weeklyDiagnostic(new Request('http://localhost/api/weekly-diagnostic', {
      method: 'POST', headers: { 'x-forwarded-for': '127.0.0.1' },
    }) as never)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ diagnostic_id: 'diag-one', diagnostic: { score: 8 } })
    expect(mocks.generateWeeklyDiagnostic).toHaveBeenCalledWith('session-user', expect.anything(), expect.objectContaining({ correlationId: 'request-test', signal: expect.any(AbortSignal) }))
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({ feature: 'weekly-diagnostic', principal: { kind: 'user', id: 'session-user' }, logicalModel: 'anthropic-opus-4.8' }))
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'succeeded' }))
    expect(mocks.generateWeeklyDiagnostic.mock.calls[0]?.[2]).toHaveProperty('performance')
  })

  it('preserves route and AI rate-limit statuses', async () => {
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    expect((await weeklyDiagnostic(new Request('http://localhost') as never)).status).toBe(429)
    mocks.startAiUsage.mockResolvedValueOnce({ status: 'unavailable' })
    const response = await weeklyDiagnostic(new Request('http://localhost') as never)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: 'Service temporairement indisponible' })
  })

  it('finalizes manual provider failures and cancellation once with safe metadata', async () => {
    mocks.generateWeeklyDiagnostic.mockResolvedValueOnce({ error: 'Erreur IA', reasonCode: 'provider_error', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 9, outputTokens: 3 } })
    let response = await weeklyDiagnostic(new Request('http://localhost/api/weekly-diagnostic', { method: 'POST' }) as never)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Erreur IA' })
    expect(mocks.finalizeUsage).toHaveBeenCalledOnce()
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', reasonCode: 'provider_error', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 9, outputTokens: 3 } }))

    mocks.finalizeUsage.mockClear()
    mocks.generateWeeklyDiagnostic.mockResolvedValueOnce({ error: 'Erreur interne', reasonCode: 'request_cancelled', cancelled: true })
    response = await weeklyDiagnostic(new Request('http://localhost/api/weekly-diagnostic', { method: 'POST' }) as never)
    expect(response.status).toBe(500)
    expect(mocks.finalizeUsage).toHaveBeenCalledOnce()
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
  })

  it('keeps an existing weekly diagnostic as a skipped public success', async () => {
    mocks.generateWeeklyDiagnostic.mockResolvedValue({ already_exists: true, diagnostic_id: 'existing-diagnostic' })
    const response = await weeklyDiagnostic(new Request('http://localhost/api/weekly-diagnostic', { method: 'POST' }) as never)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ already_exists: true, diagnostic_id: 'existing-diagnostic', message: 'Diagnostic déjà généré pour cette semaine' })
    expect(mocks.finalizeUsage).toHaveBeenCalledOnce()
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'already_exists' }))
  })
})
