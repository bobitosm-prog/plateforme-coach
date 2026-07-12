import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const sessionsCreate = vi.fn()
  const customersCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      checkout: { sessions: { create: sessionsCreate } },
      customers: { create: customersCreate },
    }
  })

  const authGetUser = vi.fn()
  const createServerClient = vi.fn(() => ({ auth: { getUser: authGetUser } }))
  const cookies = vi.fn(async () => ({ getAll: vi.fn(() => []) }))

  const profileSingle = vi.fn()
  const profileEq = vi.fn(() => ({ single: profileSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const profileUpdateEq = vi.fn()
  const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }))
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: profileSelect, update: profileUpdate }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from }))

  return {
    sessionsCreate,
    customersCreate,
    stripeConstructor,
    authGetUser,
    createServerClient,
    cookies,
    profileSingle,
    profileUpdate,
    profileUpdateEq,
    from,
    createClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { POST } from '../../app/api/stripe/coach-checkout/route'

const CLIENT_ID = '00000000-0000-4000-8000-000000000001'
const FOREIGN_CLIENT_ID = '00000000-0000-4000-8000-000000000002'
const COACH_ID = '00000000-0000-4000-8000-000000000003'
const FOREIGN_COACH_ID = '00000000-0000-4000-8000-000000000004'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/stripe/coach-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function authenticatedAs(id: string, role: string) {
  mocks.authGetUser.mockResolvedValue({
    data: { user: { id, email: `${role}@example.test`, user_metadata: { role } } },
  })
}

function mockProfiles(coachId = COACH_ID, clientId = CLIENT_ID) {
  mocks.profileSingle.mockImplementation(async () => {
    const selectedId = mocks.profileSingle.mock.calls.length === 1 ? coachId : clientId
    if (selectedId === coachId) {
      return {
        data: {
          stripe_account_id: 'acct_coach',
          coach_monthly_rate: 75,
          full_name: 'Coach Test',
          email: 'coach@example.test',
        },
        error: null,
      }
    }
    return {
      data: {
        email: 'client@example.test',
        full_name: 'Client Test',
        stripe_customer_id: 'cus_existing',
      },
      error: null,
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_coach_checkout_characterization'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_coach_checkout_characterization'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  authenticatedAs(CLIENT_ID, 'client')
  mockProfiles()
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_coach', url: 'https://checkout.test/coach' })
  mocks.customersCreate.mockResolvedValue({ id: 'cus_created' })
  mocks.profileUpdateEq.mockResolvedValue({ error: null })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('POST /api/stripe/coach-checkout — current authorization behavior', () => {
  it('returns 401 for an anonymous request before Stripe or service-role Supabase', async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(request({ clientId: CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(401)
    expect(mocks.stripeConstructor).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('allows a client to create its own coach checkout', async () => {
    const response = await POST(request({ clientId: CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.test/coach' })
  })

  it('allows a client to inject another client identity', async () => {
    mockProfiles(COACH_ID, FOREIGN_CLIENT_ID)

    const response = await POST(request({ clientId: FOREIGN_CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { clientId: FOREIGN_CLIENT_ID, coachId: COACH_ID, type: 'coach_subscription' },
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(FOREIGN_CLIENT_ID) }),
    )
  })

  it('allows the owner coach to create a checkout for a supplied client', async () => {
    authenticatedAs(COACH_ID, 'coach')

    const response = await POST(request({ clientId: CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(200)
  })

  it('allows a foreign coach to target another coach and client', async () => {
    authenticatedAs(FOREIGN_COACH_ID, 'coach')

    const response = await POST(request({ clientId: CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(200)
    expect(mocks.from).not.toHaveBeenCalledWith('coach_clients')
  })

  it.each([
    ['administrator', 'admin'],
    ['invited user', 'invited'],
    ['lifetime user', 'lifetime'],
  ])('allows an authenticated %s because no role is checked', async (_label, role) => {
    authenticatedAs(FOREIGN_CLIENT_ID, role)

    const response = await POST(request({ clientId: CLIENT_ID, coachId: COACH_ID }))

    expect(response.status).toBe(200)
  })

  it('accepts a foreign coachId without verifying a coach/client relation', async () => {
    mockProfiles(FOREIGN_COACH_ID, CLIENT_ID)

    const response = await POST(request({ clientId: CLIENT_ID, coachId: FOREIGN_COACH_ID }))

    expect(response.status).toBe(200)
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { clientId: CLIENT_ID, coachId: FOREIGN_COACH_ID, type: 'coach_subscription' },
      }),
      expect.any(Object),
    )
    expect(mocks.from).not.toHaveBeenCalledWith('coach_clients')
  })
})
