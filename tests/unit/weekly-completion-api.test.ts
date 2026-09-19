import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ user: { id: 'u' } as { id: string } | null, read: vi.fn(), confirm: vi.fn(), generate: vi.fn(), quota: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }))
vi.mock('@/lib/weekly-diagnostic/completion', () => ({ readWeeklyCompletion: mocks.read, confirmWeeklyCompletion: mocks.confirm }))
vi.mock('@/lib/weekly-diagnostic/generator', () => ({ generateWeeklyDiagnostic: mocks.generate }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }), checkAiRateLimit: mocks.quota, logAiUsage: vi.fn(), aiRateLimitResponse: () => new Response('{}', { status: 429 }) }))
import { GET, POST } from '@/app/api/weekly-diagnostic/route'
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: 'u' }
  mocks.read.mockResolvedValue({ status: { canGenerate: false, diagnosticId: null } })
  mocks.quota.mockResolvedValue({ allowed: true })
})
const request = (body?: unknown) => new NextRequest('https://app.example/api/weekly-diagnostic', { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
describe('weekly completion HTTP runtime', () => {
  it('requires authentication for reading and confirming', async () => {
    mocks.user = null
    expect((await GET(new NextRequest('https://app.example/api/weekly-diagnostic'))).status).toBe(401)
    expect((await POST(request({ action: 'complete-week' }))).status).toBe(401)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
  it('rejects direct generation before confirmation without spending an AI quota', async () => {
    expect((await POST(request())).status).toBe(409)
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.quota).not.toHaveBeenCalled()
  })
  it('confirms only for the authenticated user', async () => {
    mocks.confirm.mockResolvedValue({ completion: { confirmed: true } })
    const response = await POST(request({ action: 'complete-week', userId: 'another-user', mealsConfirmed: true }))
    expect(response.status).toBe(200)
    expect(mocks.confirm.mock.calls[0][1]).toBe('u')
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('returns 503 and no generation when eligibility reads fail', async () => {
    mocks.read.mockRejectedValueOnce(new Error('DB unavailable'))
    expect((await POST(request())).status).toBe(503)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it('generates after confirmation and returns existing diagnostic data on retry', async () => {
    mocks.read.mockResolvedValue({ status: { canGenerate: true } })
    mocks.generate.mockResolvedValue({ diagnostic: { id: 'd' }, diagnostic_id: 'd' })
    expect(await (await POST(request())).json()).toMatchObject({ diagnostic: { id: 'd' } })
    mocks.read.mockResolvedValue({ status: { canGenerate: false, diagnosticId: 'd' } })
    mocks.generate.mockResolvedValue({ already_exists: true, diagnostic_id: 'd', diagnostic: { id: 'd' } })
    expect(await (await POST(request())).json()).toMatchObject({ already_exists: true, diagnostic: { id: 'd' } })
  })
  it('rejects malformed JSON and unknown actions', async () => {
    expect((await POST(new NextRequest('https://app.example/api/weekly-diagnostic', { method: 'POST', body: '{' }))).status).toBe(400)
    expect((await POST(request({ action: 'bypass' }))).status).toBe(400)
  })
})
