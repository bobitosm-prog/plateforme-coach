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
  const from = vi.fn()

  return {
    authGetUser,
    from,
    pricesCreate,
    productsCreate,
    stripeConstructor,
  }
})

vi.mock('server-only', () => ({}))
vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.authGetUser },
    from: mocks.from,
  },
}))

import { POST } from '../../app/api/stripe/setup-products/route'
import { ADMIN_EMAIL } from '../../lib/constants'
import { TEST_PERSONAS } from '../fixtures/personas'

const originalStripeKey = process.env.STRIPE_SECRET_KEY

function request(authorization?: string) {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return new Request('http://localhost/api/stripe/setup-products', {
    method: 'POST',
    headers,
  })
}

function authenticatedAs(email: string | null = ADMIN_EMAIL) {
  mocks.authGetUser.mockResolvedValue({
    data: {
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email,
      },
    },
    error: null,
  })
}

function expectNoStripeCreation() {
  expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  expect(mocks.productsCreate).not.toHaveBeenCalled()
  expect(mocks.pricesCreate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_setup_products_secure'
  authenticatedAs()
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
  if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = originalStripeKey
})

describe('POST /api/stripe/setup-products — shared admin authorization', () => {
  it('returns 401 when the Authorization header is absent', async () => {
    const response = await POST(request())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Missing or invalid Authorization header',
    })
    expect(mocks.authGetUser).not.toHaveBeenCalled()
    expectNoStripeCreation()
  })

  it('returns 401 when the Authorization scheme is not Bearer', async () => {
    const response = await POST(request('Basic credentials'))

    expect(response.status).toBe(401)
    expect(mocks.authGetUser).not.toHaveBeenCalled()
    expectNoStripeCreation()
  })

  it('returns 401 when the Bearer token is empty', async () => {
    const response = await POST(request('Bearer '))

    expect(response.status).toBe(401)
    expect(mocks.authGetUser).not.toHaveBeenCalled()
    expectNoStripeCreation()
  })

  it('returns 401 when Supabase rejects the token', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token'),
    })

    const response = await POST(request('Bearer invalid-token'))

    expect(response.status).toBe(401)
    expect(mocks.authGetUser).toHaveBeenCalledWith('invalid-token')
    expectNoStripeCreation()
  })

  it('returns 401 when Supabase returns no user without an error', async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await POST(request('Bearer anonymous-token'))

    expect(response.status).toBe(401)
    expectNoStripeCreation()
  })

  it('returns 500 when the shared Supabase admin lookup throws', async () => {
    mocks.authGetUser.mockRejectedValue(new Error('Supabase unavailable'))

    const response = await POST(request('Bearer admin-token'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
    expectNoStripeCreation()
  })

  it.each([
    ['standard client', TEST_PERSONAS.client.email],
    ['standard coach', TEST_PERSONAS.coach.email],
    ['invited user', TEST_PERSONAS.invited.email],
    ['lifetime non-admin', TEST_PERSONAS.lifetime.email],
  ])('returns 403 for a %s regardless of subscription data', async (_label, email) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    authenticatedAs(email)

    const response = await POST(request('Bearer non-admin-token'))

    expect(response.status).toBe(403)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.parse(String(warn.mock.calls[0][0])).reason).toBe('ADMIN_REQUIRED')
    expect(mocks.from).not.toHaveBeenCalled()
    expectNoStripeCreation()
  })

  it('returns 403 when the authenticated user has no email', async () => {
    authenticatedAs(null)

    const response = await POST(request('Bearer no-email-token'))

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it.each([
    ['different case', ADMIN_EMAIL.toUpperCase()],
    ['surrounding whitespace', ` ${ADMIN_EMAIL} `],
  ])('returns 403 for an admin email with %s because the shared contract compares exactly', async (_label, email) => {
    authenticatedAs(email)

    const response = await POST(request('Bearer malformed-admin-token'))

    expect(response.status).toBe(403)
    expectNoStripeCreation()
  })

  it('authorizes the configured admin without reading a profile or subscription', async () => {
    const response = await POST(request('Bearer admin-token'))

    expect(response.status).toBe(200)
    expect(mocks.authGetUser).toHaveBeenCalledWith('admin-token')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('authorizes the configured admin independently of a lifetime subscription', async () => {
    authenticatedAs(ADMIN_EMAIL)

    const response = await POST(request('Bearer admin-with-lifetime-token'))

    expect(response.status).toBe(200)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('uses the existing hard-coded fallback when admin configuration is absent', async () => {
    expect(ADMIN_EMAIL).toBe(process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com')
    authenticatedAs(ADMIN_EMAIL)

    const response = await POST(request('Bearer fallback-admin-token'))

    expect(response.status).toBe(200)
    expect(mocks.productsCreate).toHaveBeenCalledTimes(2)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(4)
  })

  it('preserves the current non-idempotent creation behavior for repeated admin calls', async () => {
    mocks.productsCreate
      .mockResolvedValueOnce({ id: 'prod_client_2' })
      .mockResolvedValueOnce({ id: 'prod_coach_2' })
    mocks.pricesCreate
      .mockResolvedValueOnce({ id: 'price_monthly_2' })
      .mockResolvedValueOnce({ id: 'price_yearly_2' })
      .mockResolvedValueOnce({ id: 'price_lifetime_2' })
      .mockResolvedValueOnce({ id: 'price_coach_2' })

    const first = await POST(request('Bearer admin-token'))
    const second = await POST(request('Bearer admin-token'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mocks.productsCreate).toHaveBeenCalledTimes(4)
    expect(mocks.pricesCreate).toHaveBeenCalledTimes(8)
  })
})
