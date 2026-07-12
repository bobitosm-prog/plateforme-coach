import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const sessionsCreate = vi.fn()
  const customersCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() { return { checkout: { sessions: { create: sessionsCreate } }, customers: { create: customersCreate } } })
  const authGetUser = vi.fn()
  const createServerClient = vi.fn(() => ({ auth: { getUser: authGetUser } }))
  const cookies = vi.fn(async () => ({ getAll: vi.fn(() => []) }))
  const profileSingle = vi.fn()
  const profileEq = vi.fn(() => ({ single: profileSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const profileUpdateEq = vi.fn()
  const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }))
  const relationMaybeSingle = vi.fn()
  const relationStatusEq = vi.fn(() => ({ maybeSingle: relationMaybeSingle }))
  const relationClientEq = vi.fn(() => ({ eq: relationStatusEq }))
  const relationSelect = vi.fn(() => ({ eq: relationClientEq }))
  const from = vi.fn((table: string) => table === 'coach_clients'
    ? { select: relationSelect }
    : { select: profileSelect, update: profileUpdate })
  const createClient = vi.fn(() => ({ from }))
  return { sessionsCreate, customersCreate, stripeConstructor, authGetUser, createServerClient, cookies, profileSingle, relationMaybeSingle, profileUpdate, profileUpdateEq, from, createClient }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { POST } from '../../app/api/stripe/coach-checkout/route'

const CLIENT_ID = '00000000-0000-4000-8000-000000000001'
const COACH_ID = '00000000-0000-4000-8000-000000000003'
const FOREIGN_ID = '00000000-0000-4000-8000-000000000004'
const originalEnv = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL }

function request(body: Record<string, unknown> = {}): NextRequest { return new Request('http://localhost/api/stripe/coach-checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as NextRequest }
function authenticatedAs(id = CLIENT_ID) { mocks.authGetUser.mockResolvedValue({ data: { user: { id, email: 'user@example.test' } } }) }
function profiles(role = 'client', coachExists = true) {
  mocks.profileSingle
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: coachExists ? { role: 'coach', stripe_account_id: 'acct_coach', coach_monthly_rate: 75, full_name: 'Coach Test', email: 'coach@example.test' } : null, error: null })
    .mockResolvedValueOnce({ data: { email: 'client@example.test', full_name: 'Client Test', stripe_customer_id: 'cus_existing' }, error: null })
}
function expectNoMutation() { expect(mocks.stripeConstructor).not.toHaveBeenCalled(); expect(mocks.sessionsCreate).not.toHaveBeenCalled(); expect(mocks.customersCreate).not.toHaveBeenCalled(); expect(mocks.profileUpdate).not.toHaveBeenCalled() }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.profileSingle.mockReset()
  process.env.STRIPE_SECRET_KEY = 'sk_test_coach_checkout_secure'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_secure'; process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_test'; process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  authenticatedAs(); profiles(); mocks.relationMaybeSingle.mockResolvedValue({ data: { coach_id: COACH_ID }, error: null }); mocks.sessionsCreate.mockResolvedValue({ id: 'cs_coach', url: 'https://checkout.test/coach' }); mocks.profileUpdateEq.mockResolvedValue({ error: null })
})
afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/stripe/coach-checkout — secured authorization', () => {
  it('returns 401 anonymously before Stripe or mutation', async () => { mocks.authGetUser.mockResolvedValue({ data: { user: null } }); const response = await POST(request()); expect(response.status).toBe(401); expectNoMutation() })

  it('creates checkout for the authenticated client and its active server relation', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ metadata: { clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription' } }), expect.objectContaining({ idempotencyKey: expect.stringContaining(CLIENT_ID) }))
  })

  it.each([['clientId', FOREIGN_ID], ['coachId', FOREIGN_ID]])('returns 400 when %s is injected', async (key, value) => { const response = await POST(request({ [key]: value })); expect(response.status).toBe(400); expectNoMutation() })

  it.each(['coach', 'admin', 'invited'])('returns 403 for role %s before Stripe or mutation', async role => { mocks.profileSingle.mockReset(); profiles(role); const response = await POST(request()); expect(response.status).toBe(403); expectNoMutation() })

  it('returns 403 when no active coach relation exists', async () => { const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); mocks.relationMaybeSingle.mockResolvedValue({ data: null, error: null }); const response = await POST(request()); expect(response.status).toBe(403); expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/); expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('RELATION_FORBIDDEN'); expectNoMutation() })

  it('returns 404 when the related coach no longer exists', async () => { mocks.profileSingle.mockReset(); profiles('client', false); const response = await POST(request()); expect(response.status).toBe(404); expectNoMutation() })

  it('never uses a foreign caller as client identity', async () => { authenticatedAs(FOREIGN_ID); mocks.relationMaybeSingle.mockResolvedValue({ data: null, error: null }); const response = await POST(request()); expect(response.status).toBe(403); expect(mocks.relationMaybeSingle).toHaveBeenCalled(); expectNoMutation() })
})
