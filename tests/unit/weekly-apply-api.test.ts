import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ user: { id: 'owner' } as { id: string } | null,
  apply: vi.fn(), rate: vi.fn(), guard: vi.fn(), db: {} }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mocks.db }))
vi.mock('@/lib/api-guard', () => ({ guardCoachManagedCapabilities: mocks.guard }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }))
vi.mock('@/lib/weekly-diagnostic/apply', () => ({ applyWeeklyDiagnostic: mocks.apply }))
import { POST } from '@/app/api/weekly-diagnostic/[id]/apply/route'
const id = '77777777-7777-4777-8777-777777777771'
const request = () => new NextRequest('https://app.example/api/weekly-diagnostic/test/apply', { method: 'POST',
  body: JSON.stringify({ userId: 'other', calorie_goal_new: 999, plan: {} }) })
const params = { params: Promise.resolve({ id }) }
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: 'owner' }; mocks.rate.mockReturnValue({ allowed: true })
  mocks.guard.mockResolvedValue(null); mocks.apply.mockResolvedValue({ status: 200, already_applied: false })
})
describe('weekly application HTTP runtime', () => {
  it('ignores all body-supplied ownership, goals and plans', async () => {
    expect((await POST(request(), params)).status).toBe(200)
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(mocks.db, 'owner', id)
    expect(mocks.guard).toHaveBeenCalledWith('owner')
  })
  it('requires authentication', async () => {
    mocks.user = null
    expect((await POST(request(), params)).status).toBe(401)
    expect(mocks.apply).not.toHaveBeenCalled()
  })
  it('enforces rate and entitlement guards', async () => {
    mocks.rate.mockReturnValue({ allowed: false })
    expect((await POST(request(), params)).status).toBe(429)
    mocks.rate.mockReturnValue({ allowed: true }); mocks.guard.mockResolvedValue(new Response(null, { status: 403 }))
    expect((await POST(request(), params)).status).toBe(403)
    expect(mocks.apply).not.toHaveBeenCalled()
  })
  it('rejects invalid ids and hides unexpected errors', async () => {
    expect((await POST(request(), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(404)
    mocks.apply.mockRejectedValue(new Error('internal private detail'))
    const response = await POST(request(), params)
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ code: 'unavailable' })
  })
})
