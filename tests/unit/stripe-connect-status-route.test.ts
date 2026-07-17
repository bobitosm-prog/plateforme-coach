import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const accountsRetrieve = vi.fn()
  const stripeConstructor = vi.fn(function StripeMock() {
    return { accounts: { retrieve: accountsRetrieve } }
  })
  const getUser = vi.fn()
  const profileSingle = vi.fn()
  const profileEq = vi.fn(() => ({ single: profileSingle }))
  const profileSelect = vi.fn(() => ({ eq: profileEq }))
  const from = vi.fn(() => ({ select: profileSelect }))
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, from }))
  return { accountsRetrieve, stripeConstructor, getUser, profileSingle, from, createSupabaseRouteClient }
})

vi.mock('stripe', () => ({ default: mocks.stripeConstructor }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: mocks.createSupabaseRouteClient }))

import { POST } from '../../app/api/stripe/check-account/route'

const originalSecret = process.env.STRIPE_SECRET_KEY
const USER_ID = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_status_only'
  mocks.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
  mocks.profileSingle.mockResolvedValue({ data: { role: 'coach', stripe_account_id: 'acct_server' }, error: null })
  mocks.accountsRetrieve.mockResolvedValue({
    id: 'acct_server', deleted: false, charges_enabled: true, payouts_enabled: true,
    details_submitted: true, requirements: { currently_due: [] },
  })
})

afterAll(() => {
  if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = originalSecret
})

describe('POST /api/stripe/check-account', () => {
  it('rejects anonymous callers before profile or Stripe access', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await POST()
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  })

  it.each(['client', 'invited'])('rejects the non-coach role %s before Stripe', async role => {
    mocks.profileSingle.mockResolvedValue({ data: { role, stripe_account_id: 'acct_server' }, error: null })
    const response = await POST()
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(mocks.stripeConstructor).not.toHaveBeenCalled()
  })

  it('returns a controlled profile error', async () => {
    mocks.profileSingle.mockResolvedValue({ data: null, error: { message: 'synthetic' } })
    const response = await POST()
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Profile not found' })
  })

  it('uses only the account stored on the authenticated profile', async () => {
    const response = await POST()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      connected: true,
      status: 'active',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: [],
    })
    expect(mocks.accountsRetrieve).toHaveBeenCalledWith('acct_server')
    expect(mocks.accountsRetrieve).not.toHaveBeenCalledWith('acct_foreign')
  })

  it('preserves the no-account and Stripe-not-configured response contracts', async () => {
    mocks.profileSingle.mockResolvedValue({ data: { role: 'coach', stripe_account_id: null }, error: null })
    await expect((await POST()).json()).resolves.toEqual({ connected: false, status: 'no_account' })
    delete process.env.STRIPE_SECRET_KEY
    await expect((await POST()).json()).resolves.toEqual({ connected: false, status: 'error', error: 'Stripe non configuré' })
  })

  it('redacts provider errors', async () => {
    mocks.accountsRetrieve.mockRejectedValue(new Error('sk_live_sensitive provider detail'))
    const response = await POST()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ connected: false, status: 'error', error: 'Erreur Stripe Connect' })
    expect(JSON.stringify(body)).not.toContain('sk_live_sensitive')
  })
})
