import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), generate: vi.fn(), startUsage: vi.fn(), finalizers: [] as ReturnType<typeof vi.fn>[] }))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/weekly-diagnostic/generator', () => ({ generateWeeklyDiagnostic: mocks.generate }))
vi.mock('@/lib/ai/usage', () => ({ aiUsageCorrelationId: () => 'cron-operation', startAiUsage: mocks.startUsage }))

import { POST } from '@/app/api/weekly-diagnostic/cron/route'

function request(signal?: AbortSignal) {
  return new Request('http://localhost/api/weekly-diagnostic/cron', { method: 'POST', signal, headers: { authorization: 'Bearer cron-secret' } }) as never
}

function database(users: Array<{ id: string; full_name: string; next_diagnostic_at: null }>) {
  const or = vi.fn().mockResolvedValue({ data: users, error: null })
  const secondEq = vi.fn(() => ({ or }))
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  const select = vi.fn(() => ({ eq: firstEq }))
  return { from: vi.fn(() => ({ select })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.finalizers.length = 0
  process.env.CRON_SECRET = 'cron-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  mocks.createClient.mockReturnValue(database([]))
  mocks.startUsage.mockImplementation(async () => {
    const finalize = vi.fn()
    mocks.finalizers.push(finalize)
    return { status: 'started', tracker: { finalize } }
  })
})

describe('weekly diagnostic cron orchestration', () => {
  it('preserves cron authority before creating the service-role client', async () => {
    delete process.env.CRON_SECRET
    expect((await POST(request())).status).toBe(500)
    process.env.CRON_SECRET = 'cron-secret'
    const unauthorized = new Request('http://localhost/api/weekly-diagnostic/cron', { method: 'POST' }) as never
    expect((await POST(unauthorized)).status).toBe(401)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('keeps batches ordered, concurrent by five and preserves partial results', async () => {
    const users = Array.from({ length: 7 }, (_, index) => ({ id: `user-${index}`, full_name: `Synthetic ${index}`, next_diagnostic_at: null }))
    mocks.createClient.mockReturnValue(database(users))
    let active = 0
    let maximum = 0
    mocks.generate.mockImplementation(async (id: string) => {
      active++
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      active--
      if (id === 'user-1') return { error: 'Erreur IA', reasonCode: 'provider_error' }
      if (id === 'user-2') return { already_exists: true, diagnostic_id: 'existing' }
      return { diagnostic_id: `diag-${id}`, providerModel: 'claude-opus-4-8', tokens: { inputTokens: 10, outputTokens: 5 } }
    })
    const response = await POST(request())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ total: 7, success: 5, skipped: 1, errors: 1 })
    expect(mocks.generate.mock.calls.map(call => call[0])).toEqual(users.map(user => user.id))
    expect(maximum).toBe(5)
    expect(mocks.startUsage).toHaveBeenCalledTimes(7)
    expect(mocks.startUsage).toHaveBeenNthCalledWith(1, expect.objectContaining({
      feature: 'weekly-diagnostic-cron', logicalModel: 'anthropic-opus-4.8',
      principal: { kind: 'server', id: 'cron.weekly-diagnostic', subjectUserId: 'user-0' },
      correlationId: 'cron-operation:user-0',
    }))
    expect(mocks.finalizers).toHaveLength(7)
    expect(mocks.finalizers.every(finalize => finalize.mock.calls.length === 1)).toBe(true)
    expect(mocks.finalizers[0]).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'succeeded', providerModel: 'claude-opus-4-8', tokens: { inputTokens: 10, outputTokens: 5 } }))
    expect(mocks.finalizers[1]).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed', reasonCode: 'provider_error' }))
    expect(mocks.finalizers[2]).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'already_exists' }))
  })

  it('represents a totally failed run without invented success', async () => {
    const users = [{ id: 'user-a', full_name: 'A', next_diagnostic_at: null }, { id: 'user-b', full_name: 'B', next_diagnostic_at: null }]
    mocks.createClient.mockReturnValue(database(users))
    mocks.generate.mockResolvedValue({ error: 'Format IA invalide', reasonCode: 'invalid_output' })
    const body = await (await POST(request())).json()
    expect(body).toMatchObject({ total: 2, success: 0, skipped: 0, errors: 2 })
    expect(body.details.every((detail: { status: string }) => detail.status === 'error')).toBe(true)
  })

  it('does not start a later batch after server cancellation', async () => {
    const users = Array.from({ length: 6 }, (_, index) => ({ id: `user-${index}`, full_name: 'Synthetic', next_diagnostic_at: null }))
    mocks.createClient.mockReturnValue(database(users))
    const controller = new AbortController()
    mocks.generate.mockImplementation(async () => {
      controller.abort()
      return { error: 'Erreur interne', reasonCode: 'request_cancelled', cancelled: true }
    })
    await POST(request(controller.signal))
    expect(mocks.generate).toHaveBeenCalledTimes(5)
    expect(mocks.startUsage).toHaveBeenCalledTimes(5)
    expect(mocks.finalizers.every(finalize => finalize.mock.calls[0][0].outcome === 'cancelled')).toBe(true)
  })
})
