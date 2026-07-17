import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const accountsCreate = vi.fn()
  const accountLinksCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      accounts: { create: accountsCreate },
      accountLinks: { create: accountLinksCreate },
    }
  })

  const serviceProfileSingle = vi.fn()
  const serviceProfileMaybeSingle = vi.fn()
  const serviceSelectAfterUpdate = vi.fn(() => ({ maybeSingle: serviceProfileMaybeSingle }))
  const serviceIs = vi.fn(() => ({ select: serviceSelectAfterUpdate }))
  const serviceEqAfterUpdate = vi.fn(() => ({ is: serviceIs }))
  const serviceUpdate = vi.fn(() => ({ eq: serviceEqAfterUpdate }))
  const serviceEqAfterSelect = vi.fn(() => ({ single: serviceProfileSingle }))
  const serviceSelect = vi.fn(() => ({ eq: serviceEqAfterSelect }))
  const serviceFrom = vi.fn(() => ({ select: serviceSelect, update: serviceUpdate }))
  const createClient = vi.fn(() => ({ from: serviceFrom }))

  const authGetUser = vi.fn()
  const authProfileSingle = vi.fn()
  const authProfileEq = vi.fn(() => ({ single: authProfileSingle }))
  const authProfileSelect = vi.fn(() => ({ eq: authProfileEq }))
  const authFrom = vi.fn(() => ({ select: authProfileSelect }))
  const authClient = { auth: { getUser: authGetUser }, from: authFrom }
  const createSupabaseRouteClient = vi.fn(async () => authClient)

  return {
    accountsCreate,
    accountLinksCreate,
    stripeConstructor,
    serviceProfileSingle,
    serviceProfileMaybeSingle,
    serviceEqAfterUpdate,
    serviceUpdate,
    serviceFrom,
    createClient,
    authGetUser,
    authProfileSingle,
    authFrom,
    createSupabaseRouteClient,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))

import { POST } from '../../app/api/stripe/connect/route'

const OWNER_ID = '00000000-0000-4000-8000-000000000001'
const OTHER_ID = '00000000-0000-4000-8000-000000000002'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/stripe/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function authenticatedAs(id = OWNER_ID, email = 'session@example.test') {
  mocks.authGetUser.mockResolvedValue({ data: { user: { id, email } } })
}

function profileAs(
  role: string,
  stripeAccountId: string | null = null,
  email = 'profile@example.test',
) {
  mocks.authProfileSingle.mockResolvedValue({
    data: { role, email, stripe_account_id: stripeAccountId },
    error: null,
  })
}

function expectNoExternalMutation() {
  expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  expect(mocks.accountsCreate).not.toHaveBeenCalled()
  expect(mocks.accountLinksCreate).not.toHaveBeenCalled()
  expect(mocks.createClient).not.toHaveBeenCalled()
  expect(mocks.serviceUpdate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_authorization_only'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_authorization_only'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'

  authenticatedAs()
  profileAs('coach')
  mocks.accountsCreate.mockResolvedValue({ id: 'acct_created' })
  mocks.accountLinksCreate.mockResolvedValue({ url: 'https://connect.test/onboarding' })
  mocks.serviceProfileSingle.mockResolvedValue({ data: { stripe_account_id: null } })
  mocks.serviceProfileMaybeSingle.mockResolvedValue({
    data: { stripe_account_id: 'acct_created' },
  })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('POST /api/stripe/connect — authorization', () => {
  it('returns 401 for an anonymous request before any external call', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.authGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(401)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('AUTH_REQUIRED')
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expectNoExternalMutation()
  })

  it.each([
    ['standard user', 'client'],
    ['invited user', 'invited'],
    ['lifetime non-coach', 'client'],
    ['administrator', 'admin'],
  ])('returns 403 for an authenticated %s', async (_label, role) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    profileAs(role)

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(403)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('ROLE_FORBIDDEN')
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expectNoExternalMutation()
  })

  it('returns 403 when a coach targets another profile', async () => {
    authenticatedAs(OTHER_ID, 'other-coach@example.test')

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(mocks.authFrom).not.toHaveBeenCalled()
    expectNoExternalMutation()
  })

  it('returns 400 for an authenticated caller when coachId is absent', async () => {
    const response = await POST(request({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'coachId required' })
    expect(mocks.authFrom).not.toHaveBeenCalled()
    expectNoExternalMutation()
  })

  it('returns a controlled profile error before service-role or Stripe access', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.authProfileSingle.mockResolvedValue({ data: null, error: { message: 'synthetic profile failure' } })

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(403)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('PROFILE_UNAVAILABLE')
    await expect(response.json()).resolves.toEqual({ error: 'Profile not found' })
    expectNoExternalMutation()
  })

  it('ignores a foreign existingAccountId and creates an account using the server-side email', async () => {
    authenticatedAs(OWNER_ID, 'session@example.test')
    profileAs('coach', null, 'trusted-profile@example.test')

    const response = await POST(request({
      coachId: OWNER_ID,
      email: 'attacker-controlled@example.test',
      existingAccountId: 'acct_foreign',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://connect.test/onboarding',
      accountId: 'acct_created',
    })
    expect(mocks.accountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'trusted-profile@example.test',
        metadata: { coachId: OWNER_ID },
      }),
      { idempotencyKey: `connect-account-${OWNER_ID}` },
    )
    expect(mocks.serviceUpdate).toHaveBeenCalledWith({ stripe_account_id: 'acct_created' })
    expect(mocks.serviceEqAfterUpdate).toHaveBeenCalledWith('id', OWNER_ID)
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith(expect.objectContaining({
      account: 'acct_created',
    }))
  })

  it('reuses only the Stripe account stored on the authenticated coach profile', async () => {
    profileAs('coach', 'acct_stored')

    const response = await POST(request({
      coachId: OWNER_ID,
      existingAccountId: 'acct_foreign',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: 'https://connect.test/onboarding',
      accountId: 'acct_stored',
    })
    expect(mocks.accountsCreate).not.toHaveBeenCalled()
    expect(mocks.serviceUpdate).not.toHaveBeenCalled()
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith({
      account: 'acct_stored',
      refresh_url: 'http://app.test/?stripe=refresh',
      return_url: 'http://app.test/?stripe=success&account=acct_stored',
      type: 'account_onboarding',
    })
  })

  it('returns a controlled 500 without mutation when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Stripe non configuré' })
    expectNoExternalMutation()
  })

  it('maps a Stripe failure without leaking provider details', async () => {
    mocks.accountsCreate.mockRejectedValue(new Error('sk_live_sensitive signed up for Connect'))

    const response = await POST(request({ coachId: OWNER_ID }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Erreur Stripe Connect',
      setup_url: 'https://dashboard.stripe.com/connect',
    })
    expect(JSON.stringify(body)).not.toContain('sk_live_sensitive')
  })
})
