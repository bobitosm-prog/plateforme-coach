import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  supabase: vi.fn(() => ({ kind: 'supabase-admin', auth: {}, from: vi.fn() })),
  stripe: vi.fn(function StripeMock(this: object, key: string) {
    Object.assign(this, { kind: 'stripe-admin', key, subscriptions: {} })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.supabase }))
vi.mock('stripe', () => ({ default: mocks.stripe }))

const original = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripe: process.env.STRIPE_SECRET_KEY,
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.STRIPE_SECRET_KEY
})

afterEach(() => {
  restore('NEXT_PUBLIC_SUPABASE_URL', original.url)
  restore('NEXT_PUBLIC_SUPABASE_ANON_KEY', original.anon)
  restore('SUPABASE_SERVICE_ROLE_KEY', original.service)
  restore('STRIPE_SECRET_KEY', original.stripe)
})

describe('lazy server admin clients', () => {
  it('imports both modules without configuration or client construction', async () => {
    await expect(import('../../lib/supabase/admin')).resolves.toBeDefined()
    await expect(import('../../lib/admin/stripe')).resolves.toBeDefined()
    expect(mocks.supabase).not.toHaveBeenCalled()
    expect(mocks.stripe).not.toHaveBeenCalled()
  })

  it('fails closed on first Supabase use without exposing or using the anon key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-sensitive-fixture'
    const { getSupabaseAdmin } = await import('../../lib/supabase/admin')

    expect(() => getSupabaseAdmin()).toThrow('Supabase server configuration is incomplete')
    expect(mocks.supabase).not.toHaveBeenCalled()
    expect(() => getSupabaseAdmin()).not.toThrow(/public-anon-sensitive-fixture/)
  })

  it('constructs and caches one Supabase admin client from service-role configuration', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://synthetic.supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-not-used'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-role-synthetic'
    const { getSupabaseAdmin, supabaseAdmin } = await import('../../lib/supabase/admin')

    expect(getSupabaseAdmin()).toBe(getSupabaseAdmin())
    expect(supabaseAdmin.auth).toEqual({})
    expect(mocks.supabase).toHaveBeenCalledTimes(1)
    expect(mocks.supabase).toHaveBeenCalledWith(
      'https://synthetic.supabase.test',
      'server-role-synthetic',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    )
    expect(mocks.supabase).not.toHaveBeenCalledWith(expect.anything(), 'public-anon-not-used', expect.anything())
  })

  it('fails closed on first Stripe use without leaking or inventing a key', async () => {
    const { getAdminStripe } = await import('../../lib/admin/stripe')

    expect(() => getAdminStripe()).toThrow('Stripe server configuration is incomplete')
    expect(mocks.stripe).not.toHaveBeenCalled()
    expect(() => getAdminStripe()).not.toThrow(/sk_(?:live|test)_/)
  })

  it('rejects an invalid explicit Stripe credential without constructing a client', async () => {
    process.env.STRIPE_SECRET_KEY = 'invalid-synthetic-credential'
    const { getAdminStripe } = await import('../../lib/admin/stripe')

    expect(() => getAdminStripe()).toThrow('Stripe server configuration is incomplete')
    expect(mocks.stripe).not.toHaveBeenCalled()
    expect(() => getAdminStripe()).not.toThrow(/invalid-synthetic-credential/)
  })

  it('constructs and caches one Stripe client from explicit synthetic configuration', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic_fixture'
    const { getAdminStripe, stripe } = await import('../../lib/admin/stripe')

    expect(getAdminStripe()).toBe(getAdminStripe())
    expect(stripe.subscriptions).toEqual({})
    expect(mocks.stripe).toHaveBeenCalledTimes(1)
    expect(mocks.stripe).toHaveBeenCalledWith('sk_test_synthetic_fixture', { typescript: true })
  })
})
