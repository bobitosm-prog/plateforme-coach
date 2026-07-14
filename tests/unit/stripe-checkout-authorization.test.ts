import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { stripeMock } from '../mocks/stripe'

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY = 'price_client_monthly_test'
  process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY = 'price_coach_monthly_test'
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
    authGetUser, authProfileSingle, authFrom,
    createSupabaseRouteClient, ownerMaybeSingle, paymentsInsert, serviceFrom, createClient,
  }
})

vi.mock('stripe', async () => ({ default: (await import('../mocks/stripe')).stripeMock.constructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: mocks.createSupabaseRouteClient }))

import { POST } from '../../app/api/stripe/checkout/route'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const FOREIGN_ID = '00000000-0000-4000-8000-000000000002'
const originalEnv = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, MOOVX_E2E: process.env.MOOVX_E2E, STRIPE_E2E_BASE_URL: process.env.STRIPE_E2E_BASE_URL }

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as NextRequest
}

function authenticatedAs(id = USER_ID, role = 'client') {
  mocks.authGetUser.mockResolvedValue({ data: { user: { id, email: `${role}@example.test` } } })
  mocks.authProfileSingle.mockResolvedValue({ data: { role, subscription_status: null, subscription_type: null }, error: null })
}

function expectNoMutation() {
  expect(stripeMock.constructor).not.toHaveBeenCalled()
  expect(stripeMock.calls['checkout.sessions.create']).not.toHaveBeenCalled()
  expect(mocks.paymentsInsert).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_secure'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_checkout_secure'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  delete process.env.MOOVX_E2E
  delete process.env.STRIPE_E2E_BASE_URL
  authenticatedAs()
  mocks.ownerMaybeSingle.mockResolvedValue({ data: null, error: null })
  stripeMock.succeed('checkout.sessions.create', { id: 'cs_platform', url: 'https://checkout.test/platform' })
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
    expect(stripeMock.calls['checkout.sessions.create']).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ clientId: USER_ID, coachId: 'platform' }) }), expect.objectContaining({ idempotencyKey: expect.stringContaining(USER_ID) }))
    expect(mocks.paymentsInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: USER_ID, coach_id: null }))
  })

  it('creates a coach plan only for the authenticated coach', async () => {
    authenticatedAs(USER_ID, 'coach')
    const response = await POST(request({ planId: 'coach_monthly' }))
    expect(response.status).toBe(200)
    expect(stripeMock.calls['checkout.sessions.create']).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ clientId: USER_ID, planId: 'coach_monthly' }) }), expect.any(Object))
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

  it('allows a local Stripe transport only in explicit E2E mode', async () => {
    process.env.MOOVX_E2E = '1'
    process.env.STRIPE_E2E_BASE_URL = 'http://127.0.0.1:55326/'
    const response = await POST(request({ planId: 'client_monthly' }))
    expect(response.status).toBe(200)
    expect(stripeMock.constructor).toHaveBeenCalledWith('sk_test_checkout_secure', {
      host: '127.0.0.1', port: 55326, protocol: 'http',
    })
  })

  it.each(['https://api.stripe.com/', 'http://evil.example/', 'http://127.0.0.1:55326/v1'])('refuses an unsafe Stripe E2E endpoint: %s', async endpoint => {
    process.env.MOOVX_E2E = '1'
    process.env.STRIPE_E2E_BASE_URL = endpoint
    const response = await POST(request({ planId: 'client_monthly' }))
    expect(response.status).toBe(500)
    expectNoMutation()
  })

  it('refuses the local Stripe transport outside explicit E2E mode', async () => {
    process.env.STRIPE_E2E_BASE_URL = 'http://127.0.0.1:55326/'
    const response = await POST(request({ planId: 'client_monthly' }))
    expect(response.status).toBe(500)
    expectNoMutation()
  })
})
