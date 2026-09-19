import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY = 'price_client_monthly_test'
  process.env.NEXT_PUBLIC_PRICE_CLIENT_YEARLY = 'price_client_yearly_test'
  process.env.NEXT_PUBLIC_PRICE_CLIENT_LIFETIME = 'price_client_lifetime_test'
  process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY = 'price_coach_monthly_test'

  const authGetUser = vi.fn()
  const authProfileSingle = vi.fn()
  const authFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: authProfileSingle })),
    })),
  }))
  const createSupabaseRouteClient = vi.fn(async () => ({
    auth: { getUser: authGetUser },
    from: authFrom,
  }))

  const adminFrom = vi.fn()
  const createClient = vi.fn(() => ({ from: adminFrom }))

  const checkoutCreate = vi.fn()
  const accountsCreate = vi.fn()
  const accountLinksCreate = vi.fn()
  const customersCreate = vi.fn()
  const productsCreate = vi.fn()
  const pricesCreate = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return {
      checkout: { sessions: { create: checkoutCreate } },
      accounts: { create: accountsCreate },
      accountLinks: { create: accountLinksCreate },
      customers: { create: customersCreate },
      products: { create: productsCreate },
      prices: { create: pricesCreate },
    }
  })

  const adminAuthGetUser = vi.fn()
  const sharedAdminFrom = vi.fn()

  return {
    authGetUser,
    authProfileSingle,
    authFrom,
    createSupabaseRouteClient,
    adminFrom,
    createClient,
    checkoutCreate,
    accountsCreate,
    accountLinksCreate,
    customersCreate,
    productsCreate,
    pricesCreate,
    stripeConstructor,
    adminAuthGetUser,
    sharedAdminFrom,
  }
})

vi.mock('server-only', () => ({}))
vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.adminAuthGetUser },
    from: mocks.sharedAdminFrom,
  },
}))

import { POST as checkout } from '../../app/api/stripe/checkout/route'
import { POST as coachCheckout } from '../../app/api/stripe/coach-checkout/route'
import { POST as connect } from '../../app/api/stripe/connect/route'
import { POST as setupProducts } from '../../app/api/stripe/setup-products/route'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const OTHER_ID = '00000000-0000-4000-8000-000000000002'
const COACH_ID = '00000000-0000-4000-8000-000000000003'

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function request(path: string, body: Record<string, unknown>, ip: string): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  }) as NextRequest
}

function authenticate(id = USER_ID) {
  mocks.authGetUser.mockResolvedValue({ data: { user: { id, email: 'user@example.test' } } })
}

function anonymous() {
  mocks.authGetUser.mockResolvedValue({ data: { user: null } })
}

function expectNoStripeMutation() {
  expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  expect(mocks.accountsCreate).not.toHaveBeenCalled()
  expect(mocks.accountLinksCreate).not.toHaveBeenCalled()
  expect(mocks.customersCreate).not.toHaveBeenCalled()
  expect(mocks.productsCreate).not.toHaveBeenCalled()
  expect(mocks.pricesCreate).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_secure'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_APP_URL = 'http://app.test'
  authenticate()
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('critical Stripe route authorization', () => {
  it('rejects anonymous platform checkout before Stripe or service-role access', async () => {
    anonymous()

    const response = await checkout(request('/api/stripe/checkout', { planId: 'client_monthly' }, '198.51.100.1'))

    expect(response.status).toBe(401)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expectNoStripeMutation()
  })

  it('rejects browser-supplied platform checkout identities', async () => {
    const response = await checkout(request('/api/stripe/checkout', {
      planId: 'client_monthly',
      clientId: OTHER_ID,
    }, '198.51.100.2'))

    expect(response.status).toBe(400)
    expect(mocks.authFrom).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expectNoStripeMutation()
  })

  it('creates platform checkout metadata from the authenticated identity', async () => {
    mocks.authProfileSingle.mockResolvedValue({
      data: { role: 'client', subscription_status: null, subscription_type: null, stripe_subscription_id: null },
      error: null,
    })
    const paymentInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'payment-1' }, error: null })
    const paymentInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: paymentInsertSingle })) }))
    const attach = {
      eq: vi.fn(),
      is: vi.fn(),
    }
    attach.eq.mockReturnValue(attach)
    attach.is.mockReturnValue(attach)
    const paymentUpdate = vi.fn(() => attach)
    mocks.adminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) }
      }
      return { insert: paymentInsert, update: paymentUpdate }
    })
    mocks.checkoutCreate.mockResolvedValue({ id: 'cs_secure', url: 'https://checkout.test/secure' })

    const response = await checkout(request('/api/stripe/checkout', { planId: 'client_monthly' }, '198.51.100.3'))

    expect(response.status).toBe(200)
    expect(paymentInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: USER_ID, coach_id: null }))
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ clientId: USER_ID, coachId: 'platform' }) }),
      { idempotencyKey: 'checkout-payment-payment-1' },
    )
  })

  it('rejects Connect onboarding for another coach identity', async () => {
    const response = await connect(request('/api/stripe/connect', { coachId: OTHER_ID }, '198.51.100.4'))

    expect(response.status).toBe(403)
    expect(mocks.authFrom).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expectNoStripeMutation()
  })

  it('rejects Connect onboarding for a non-coach profile', async () => {
    mocks.authProfileSingle.mockResolvedValue({
      data: { role: 'client', email: 'client@example.test', stripe_account_id: null },
      error: null,
    })

    const response = await connect(request('/api/stripe/connect', { coachId: USER_ID }, '198.51.100.5'))

    expect(response.status).toBe(403)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expectNoStripeMutation()
  })

  it('rejects browser-supplied identities for coach checkout', async () => {
    const response = await coachCheckout(request('/api/stripe/coach-checkout', {
      clientId: USER_ID,
      coachId: COACH_ID,
    }, '198.51.100.6'))

    expect(response.status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expectNoStripeMutation()
  })

  it('derives the active coach relation on the server', async () => {
    let profileRead = 0
    mocks.adminFrom.mockImplementation((table: string) => {
      if (table === 'coach_clients') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { coach_id: COACH_ID }, error: null }) }) }) }) }
      }
      profileRead += 1
      if (profileRead === 1) {
        return { select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: { role: 'client', email: 'client@example.test', full_name: 'Client', stripe_customer_id: 'cus_existing' } }) }) }) }
      }
      return { select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: { role: 'coach', stripe_account_id: 'acct_coach', coach_monthly_rate: 80, full_name: 'Coach' } }) }) }) }
    })
    mocks.checkoutCreate.mockResolvedValue({ id: 'cs_coach', url: 'https://checkout.test/coach' })

    const response = await coachCheckout(request('/api/stripe/coach-checkout', {}, '198.51.100.7'))

    expect(response.status).toBe(200)
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ clientId: USER_ID, coachId: COACH_ID }),
        subscription_data: expect.objectContaining({ transfer_data: { destination: 'acct_coach' } }),
      }),
      expect.any(Object),
    )
  })

  it('requires the super_admin role for product creation', async () => {
    mocks.adminAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mocks.sharedAdminFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }) }) }),
    })
    const req = new Request('http://localhost/api/stripe/setup-products', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-user-token', 'x-forwarded-for': '198.51.100.8' },
    })

    const response = await setupProducts(req)

    expect(response.status).toBe(403)
    expectNoStripeMutation()
  })
})
