import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const productsCreate = vi.fn()
  const pricesCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      products: { create: productsCreate },
      prices: { create: pricesCreate },
    }
  })
  const authGetUser = vi.fn()
  const profileSingle = vi.fn()
  const profileEq = vi.fn(() => ({ single: profileSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const from = vi.fn(() => ({ select: profileSelect }))
  const createServerClient = vi.fn(() => ({
    auth: { getUser: authGetUser },
    from,
  }))
  const cookies = vi.fn(async () => ({ getAll: vi.fn(() => []) }))

  return {
    authGetUser,
    cookies,
    createServerClient,
    from,
    pricesCreate,
    productsCreate,
    profileSelect,
    profileSingle,
    stripeConstructor,
  }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { POST } from '../../app/api/stripe/setup-products/route'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

type CharacterizedProfile = {
  role: 'client' | 'coach' | 'invited' | 'admin'
  subscription_type: string | null
}

function authenticatedAs(email = 'user@example.test') {
  mocks.authGetUser.mockResolvedValue({
    data: { user: { id: '00000000-0000-4000-8000-000000000001', email } },
    error: null,
  })
}

function profile(data: CharacterizedProfile | null, error: Error | null = null) {
  mocks.profileSingle.mockResolvedValue({ data, error })
}

function expectNoStripeCreation() {
  expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  expect(mocks.productsCreate).not.toHaveBeenCalled()
  expect(mocks.pricesCreate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_setup_products_characterization'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_test'
  authenticatedAs()
  profile({ role: 'client', subscription_type: null })
  mocks.productsCreate
    .mockResolvedValueOnce({ id: 'prod_client_1' })
    .mockResolvedValueOnce({ id: 'prod_coach_1' })
  mocks.pricesCreate
    .mockResolvedValueOnce({ id: 'price_monthly_1' })
    .mockResolvedValueOnce({ id: 'price_yearly_1' })
    .mockResolvedValueOnce({ id: 'price_lifetime_1' })
    .mockResolvedValueOnce({ id: 'price_coach_1' })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('POST /api/stripe/setup-products — vulnerable authorization characterization', () => {
  it('returns 401 anonymously before reading a profile or creating Stripe resources', async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await POST()

    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expectNoStripeCreation()
  })

  it.each([
    ['standard client', { role: 'client', subscription_type: 'client_monthly' }],
    ['standard coach', { role: 'coach', subscription_type: 'coach_monthly' }],
    ['invited user', { role: 'invited', subscription_type: 'invited' }],
  ] satisfies Array<[string, CharacterizedProfile]>)('returns 403 for a %s before Stripe creation', async (_label, currentProfile) => {
    profile(currentProfile)

    const response = await POST()

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it('VULNERABLE: allows a lifetime non-admin and creates products and prices', async () => {
    profile({ role: 'client', subscription_type: 'lifetime' })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.profileSelect).toHaveBeenCalledWith('subscription_type')
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('VULNERABLE: rejects an existing-contract admin without lifetime', async () => {
    authenticatedAs('bobitosm@gmail.com')
    profile({ role: 'admin', subscription_type: 'client_monthly' })

    const response = await POST()

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it('allows an existing-contract admin only when the profile is lifetime', async () => {
    authenticatedAs('bobitosm@gmail.com')
    profile({ role: 'admin', subscription_type: 'lifetime' })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('returns 403 when the authenticated user has no profile', async () => {
    profile(null)

    const response = await POST()

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it('VULNERABLE: collapses a profile read error into 403', async () => {
    profile(null, new Error('profiles read failed'))

    const response = await POST()

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it('has no browser role input: authorization ignores authenticated user email and profile role', async () => {
    authenticatedAs('attacker@example.test')
    profile({ role: 'invited', subscription_type: 'lifetime' })

    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.profileSelect).toHaveBeenCalledWith('subscription_type')
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('VULNERABLE: repeated authorized calls create duplicate products and prices', async () => {
    profile({ role: 'client', subscription_type: 'lifetime' })
    mocks.productsCreate
      .mockResolvedValueOnce({ id: 'prod_client_2' })
      .mockResolvedValueOnce({ id: 'prod_coach_2' })
    mocks.pricesCreate
      .mockResolvedValueOnce({ id: 'price_monthly_2' })
      .mockResolvedValueOnce({ id: 'price_yearly_2' })
      .mockResolvedValueOnce({ id: 'price_lifetime_2' })
      .mockResolvedValueOnce({ id: 'price_coach_2' })

    const first = await POST()
    const second = await POST()

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mocks.productsCreate).toHaveBeenCalledTimes(4)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(8)
  })
})
