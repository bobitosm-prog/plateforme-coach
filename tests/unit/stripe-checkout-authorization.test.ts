import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY = 'price_client_monthly_test'
  process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY = 'price_coach_monthly_test'
  const sessionsCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return { checkout: { sessions: { create: sessionsCreate } } }
  })
  const authGetUser = vi.fn()
  const authProfileSingle = vi.fn()
  const authProfileEq = vi.fn(() => ({ single: authProfileSingle }))
  const authProfileSelect = vi.fn(() => ({ eq: authProfileEq }))
  const authFrom = vi.fn(() => ({ select: authProfileSelect }))
  const createSupabaseRouteClient = vi.fn(async () => ({
    auth: { getUser: authGetUser },
    from: authFrom,
  }))
  const ownerMaybeSingle = vi.fn()
  const ownerEq = vi.fn(() => ({ maybeSingle: ownerMaybeSingle }))
  const ownerSelect = vi.fn(() => ({ eq: ownerEq }))
  const paymentsInsert = vi.fn()
  const serviceFrom = vi.fn((table: string) => table === 'profiles'
    ? { select: ownerSelect }
    : { insert: paymentsInsert })
  const createClient = vi.fn(() => ({ from: serviceFrom }))
  return {
    sessionsCreate, stripeConstructor, authGetUser, authProfileSingle, authFrom,
    createSupabaseRouteClient, ownerMaybeSingle, paymentsInsert, serviceFrom, createClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: mocks.createSupabaseRouteClient }))

import { POST } from '../../app/api/stripe/checkout/route'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const FOREIGN_ID = '00000000-0000-4000-8000-000000000002'
const originalEnv = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL }

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as NextRequest
}

function authenticatedAs(id = USER_ID, role = 'client') {
  mocks.authGetUser.mockResolvedValue({ data: { user: { id, email: `${role}@example.test` } } })
  mocks.authProfileSingle.mockResolvedValue({ data: { role, subscription_status: null, subscription_type: null }, error: null })
}

function expectNoMutation() {
  expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  expect(mocks.paymentsInsert).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_secure'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_checkout_secure'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  authenticatedAs()
  mocks.ownerMaybeSingle.mockResolvedValue({ data: null, error: null })
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_platform', url: 'https://checkout.test/platform' })
  mocks.paymentsInsert.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/stripe/checkout — secured authorization', () => {
  it('returns 401 anonymously before Stripe or a payment write', async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })
    const response = await POST(request({ planId: 'client_monthly' }))
    expect(response.status).toBe(401)
    expectNoMutation()
  })

  it('creates a client checkout from the authenticated server identity', async () => {
    const response = await POST(request({ planId: 'client_monthly' }))
    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ clientId: USER_ID, coachId: 'platform' }) }), expect.objectContaining({ idempotencyKey: expect.stringContaining(USER_ID) }))
    expect(mocks.paymentsInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: USER_ID, coach_id: null }))
  })

  it('creates a coach plan only for the authenticated coach', async () => {
    authenticatedAs(USER_ID, 'coach')
    const response = await POST(request({ planId: 'coach_monthly' }))
    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ clientId: USER_ID, planId: 'coach_monthly' }) }), expect.any(Object))
  })

  it.each([
    ['client selecting coach plan', 'client', 'coach_monthly'],
    ['coach selecting client plan', 'coach', 'client_monthly'],
    ['administrator selecting client plan', 'admin', 'client_monthly'],
  ])('returns 403 for %s before mutation', async (_label, role, planId) => {
    authenticatedAs(USER_ID, role)
    const response = await POST(request({ planId }))
    expect(response.status).toBe(403)
    expectNoMutation()
  })

  it.each([
    ['clientId', FOREIGN_ID],
    ['coachId', FOREIGN_ID],
  ])('returns 400 when foreign %s is injected', async (key, value) => {
    const response = await POST(request({ planId: 'client_monthly', [key]: value }))
    expect(response.status).toBe(400)
    expectNoMutation()
  })

  it('returns 400 for an unknown offer before mutation', async () => {
    const response = await POST(request({ planId: 'foreign_plan' }))
    expect(response.status).toBe(400)
    expectNoMutation()
  })
})
