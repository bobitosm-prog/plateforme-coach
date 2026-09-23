import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getUser: vi.fn(), profile: vi.fn(), relation: vi.fn(), owner: vi.fn(), insert: vi.fn(),
  admin: vi.fn(), create: vi.fn(), expire: vi.fn(), limit: vi.fn(),
}))
const chain = (end: ReturnType<typeof vi.fn>) => {
  const query = { select: () => query, eq: () => query, maybeSingle: end, limit: end }
  return query
}
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: async () => ({
  auth: { getUser: m.getUser },
  from: (table: string) => chain(table === 'profiles' ? m.profile : m.relation),
}) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: m.limit }))
vi.mock('@supabase/supabase-js', () => ({ createClient: m.admin }))
vi.mock('stripe', () => ({ default: class {
  checkout = { sessions: { create: m.create, expire: m.expire } }
} }))

const clientId = '11111111-1111-4111-8111-111111111111'
const coachId = '22222222-2222-4222-8222-222222222222'
const relation = { id: 'relation-test', client_id: clientId, coach_id: coachId, status: 'active', source: 'invitation' }
let POST: typeof import('@/app/api/stripe/checkout/route')['POST']
const request = (body: unknown = { clientId }) => POST(new NextRequest('http://localhost/api/stripe/checkout', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
}))

afterEach(() => vi.unstubAllEnvs())

beforeEach(async () => {
  vi.resetAllMocks()
  vi.stubEnv('STRIPE_SECRET_KEY', 'synthetic-test-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://moovx.invalid')
  for (const plan of ['CLIENT_MONTHLY', 'CLIENT_YEARLY', 'CLIENT_LIFETIME', 'COACH_MONTHLY']) {
    vi.stubEnv(`NEXT_PUBLIC_PRICE_${plan}`, `price_${plan}`)
  }
  m.getUser.mockResolvedValue({ data: { user: { id: clientId } }, error: null })
  m.profile.mockResolvedValue({ data: { role: 'client' }, error: null })
  m.relation.mockResolvedValue({ data: [relation], error: null })
  m.owner.mockResolvedValue({ data: { stripe_account_id: 'acct_test', stripe_onboarding_complete: true }, error: null })
  m.insert.mockResolvedValue({ error: null })
  m.admin.mockReturnValue({ from: (table: string) => table === 'payments' ? { insert: m.insert } : chain(m.owner) })
  m.create.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.invalid/test' })
  m.expire.mockResolvedValue({})
  m.limit.mockReturnValue({ allowed: true })
  POST = (await import('@/app/api/stripe/checkout/route')).POST
})

describe('platform checkout authorization and failure boundaries', () => {
  it('rejects anonymous requests before privileged access', async () => {
    m.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await request()).status).toBe(401)
    expect(m.admin).not.toHaveBeenCalled()
    expect(m.create).not.toHaveBeenCalled()
  })
  it('rejects an invalid session even when user data is present', async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: clientId } }, error: new Error('invalid') })
    expect((await request()).status).toBe(401)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('rejects a different client identity', async () => {
    expect((await request({ clientId: coachId })).status).toBe(403)
    expect(m.admin).not.toHaveBeenCalled()
    expect(m.create).not.toHaveBeenCalled()
  })
  it('limits attempts before creating a checkout', async () => {
    m.limit.mockReturnValue({ allowed: false, retryAfter: 42 })
    const response = await request()
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(m.limit).toHaveBeenCalledWith(`platform-checkout:${clientId}`, 5, 60000)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it.each([null, [], 'bad', {}, { clientId: 123 }, { clientId, planId: '__proto__' }, { clientId, planId: 'constructor' }, { clientId, planId: [] }, { clientId, coachId: 'bad' }])('rejects invalid input %#', async body => {
    expect((await request(body)).status).toBe(400)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON', async () => {
    expect((await POST(new NextRequest('http://localhost/api/stripe/checkout', { method: 'POST', body: '{' }))).status).toBe(400)
  })
  it('rejects the coach plan for clients', async () => {
    expect((await request({ clientId, planId: 'coach_monthly' })).status).toBe(403)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('rejects client plans for coaches', async () => {
    m.profile.mockResolvedValue({ data: { role: 'coach' }, error: null })
    expect((await request()).status).toBe(403)
  })
  it('fails closed when profile lookup fails', async () => {
    m.profile.mockResolvedValue({ data: null, error: new Error('database') })
    expect((await request()).status).toBe(503)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('rejects an unrelated coach', async () => {
    m.relation.mockResolvedValue({ data: null, error: null })
    expect((await request({ clientId, coachId })).status).toBe(403)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('fails closed when the relationship cannot be verified', async () => {
    m.relation.mockResolvedValue({ data: null, error: new Error('database') })
    expect((await request({ clientId, coachId })).status).toBe(503)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it.each(['default', 'legacy'])('rejects non-authoritative %s attribution', async source => {
    m.relation.mockResolvedValue({ data: [{ ...relation, source }], error: null })
    expect((await request({ clientId, coachId })).status).toBe(403)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it('rejects a different coach than the verified relationship', async () => {
    m.relation.mockResolvedValue({ data: [{ ...relation, coach_id: clientId }], error: null })
    expect((await request({ clientId, coachId })).status).toBe(403)
  })
  it('fails closed on multiple active relationships', async () => {
    m.relation.mockResolvedValue({ data: [relation, { ...relation, id: 'second' }], error: null })
    expect((await request({ clientId, coachId })).status).toBe(503)
    expect(m.admin).not.toHaveBeenCalled()
  })
  it.each(['client_monthly', 'client_yearly', 'client_lifetime', 'coach_monthly'])('preserves checkout behavior for %s', async planId => {
    if (planId === 'coach_monthly') m.profile.mockResolvedValue({ data: { role: 'coach' }, error: null })
    const response = await request({ clientId, planId, coachId: 'platform' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: 'https://checkout.invalid/test' })
    const params = m.create.mock.calls[0][0]
    expect(params.mode).toBe(planId === 'client_lifetime' ? 'payment' : 'subscription')
    expect(params.line_items).toEqual([{ price: `price_${planId.toUpperCase()}`, quantity: 1 }])
    expect(params.metadata).toEqual({ clientId, planId, coachId: 'platform', subType: planId })
    expect(params.success_url).toBe(`https://moovx.invalid/${planId === 'coach_monthly' ? 'coach' : ''}?payment=success`)
    expect((params.subscription_data || params.payment_intent_data).transfer_data.destination).toBe('acct_test')
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ client_id: clientId, coach_id: null, status: 'pending', stripe_checkout_session_id: 'cs_test' }))
  })
  it('uses only a verified coach relationship in payment attribution', async () => {
    expect((await request({ clientId, coachId })).status).toBe(200)
    expect(m.create.mock.calls[0][0].metadata.coachId).toBe(coachId)
    expect(m.insert.mock.calls[0][0].coach_id).toBe(coachId)
  })
  it('does not create checkout on owner lookup failure', async () => {
    m.owner.mockResolvedValue({ data: null, error: new Error('database') })
    expect((await request()).status).toBe(503)
    expect(m.create).not.toHaveBeenCalled()
  })
  it('expires an untracked checkout and never returns its URL', async () => {
    m.insert.mockResolvedValue({ error: new Error('database') })
    const response = await request()
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('url')
    expect(m.expire).toHaveBeenCalledWith('cs_test')
  })
  it('still withholds the URL when expiration fails', async () => {
    m.insert.mockResolvedValue({ error: new Error('database') })
    m.expire.mockRejectedValue(new Error('provider'))
    expect((await request()).status).toBe(503)
  })
  it('does not leak provider errors or insert payments on provider failure', async () => {
    m.create.mockRejectedValue(new Error('private-provider-detail'))
    const response = await request()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private-provider-detail')
    expect(m.insert).not.toHaveBeenCalled()
  })
})
