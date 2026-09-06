import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stripeConstructor = vi.fn(function StripeConstructorMock() {
  return {
    subscriptions: { list: vi.fn() },
    balanceTransactions: { list: vi.fn() },
  }
})

vi.mock('server-only', () => ({}))
vi.mock('stripe', () => ({ default: stripeConstructor }))

describe('admin Stripe disabled mode', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    stripeConstructor.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('imports without creating a Stripe client when the key is absent', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')

    await expect(import('../../lib/admin/stripe')).resolves.toBeDefined()
    expect(stripeConstructor).not.toHaveBeenCalled()
  })

  it('fails closed when a Stripe client is requested without a key', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const { getStripeAdminClient } = await import('../../lib/admin/stripe')

    expect(() => getStripeAdminClient()).toThrow('Stripe is not configured')
    expect(stripeConstructor).not.toHaveBeenCalled()
  })

  it('does not need Stripe for pure MRR computation', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const { computeMrrFromSubscriptions } = await import('../../lib/admin/stripe')

    expect(computeMrrFromSubscriptions([])).toEqual({ amount: 0, currency: 'chf' })
    expect(stripeConstructor).not.toHaveBeenCalled()
  })

  it('creates the server client lazily when a key is configured', async () => {
    const configuredKey = randomUUID()
    vi.stubEnv('STRIPE_SECRET_KEY', configuredKey)
    const { getStripeAdminClient } = await import('../../lib/admin/stripe')

    const first = getStripeAdminClient()
    const second = getStripeAdminClient()

    expect(first).toBe(second)
    expect(stripeConstructor).toHaveBeenCalledOnce()
    expect(stripeConstructor).toHaveBeenCalledWith(configuredKey, {
      typescript: true,
    })
  })

  it('rejects a representative admin Stripe action without making a call', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const { listAllActiveSubscriptions } = await import('../../lib/admin/stripe')

    await expect(listAllActiveSubscriptions()).rejects.toThrow('Stripe is not configured')
    expect(stripeConstructor).not.toHaveBeenCalled()
  })
})
