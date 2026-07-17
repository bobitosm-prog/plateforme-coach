import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CheckoutServiceError,
  buildCoachMetadata,
  buildPlatformMetadata,
  createCoachCheckout,
  createPlatformCheckout,
  resolvePlatformPlan,
  validateCoachCheckoutBody,
  validatePlatformCheckoutBody,
  type CoachCheckoutRepository,
  type PlatformCheckoutRepository,
  type StripeCheckoutPort,
} from '../../lib/billing/checkout'

const CLIENT_ID = '00000000-0000-4000-8000-000000000001'
const COACH_ID = '00000000-0000-4000-8000-000000000002'

function stripePort() {
  const createSession = vi.fn(async () => ({ id: 'cs_test', url: 'https://checkout.test/session' }))
  const createCustomer = vi.fn(async () => ({ id: 'cus_test' }))
  return { port: { createSession, createCustomer } satisfies StripeCheckoutPort, createSession, createCustomer }
}

function platformRepository(overrides: Partial<PlatformCheckoutRepository> = {}) {
  const repository: PlatformCheckoutRepository = {
    findProfile: vi.fn(async () => ({ role: 'client' })),
    findPlatformConnectAccount: vi.fn(async () => null),
    insertPendingPayment: vi.fn(async () => undefined),
    ...overrides,
  }
  return repository
}

function coachRepository(overrides: Partial<CoachCheckoutRepository> = {}) {
  const repository: CoachCheckoutRepository = {
    findCallerProfile: vi.fn(async () => ({ role: 'client' })),
    findUniqueActiveCoachId: vi.fn(async () => COACH_ID),
    findCoach: vi.fn(async () => ({ role: 'coach', stripeAccountId: 'acct_coach', monthlyRate: 75, fullName: 'Coach Test' })),
    findClient: vi.fn(async () => ({ email: 'client@example.test', fullName: 'Client Test', stripeCustomerId: 'cus_existing' })),
    updateStripeCustomerId: vi.fn(async () => undefined),
    ...overrides,
  }
  return repository
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: 'CheckoutServiceError', code })
}

describe('Billing Checkout validation and metadata', () => {
  it('accepts only the legacy platform body and resolves the closed plan catalog', () => {
    expect(validatePlatformCheckoutBody({ planId: 'client_monthly' })).toBe('client_monthly')
    expect(resolvePlatformPlan('client_monthly')).toMatchObject({ requiredRole: 'client', mode: 'subscription', amount: 10 })
    expect(() => resolvePlatformPlan('foreign_plan')).toThrowError(CheckoutServiceError)
  })

  it.each([
    { planId: 'client_monthly', clientId: 'foreign' },
    { planId: 'client_monthly', coachId: 'foreign' },
    { planId: 'client_monthly', stripeAccountId: 'acct_foreign' },
  ])('rejects injected platform authority before any provider call: $clientId$coachId$stripeAccountId', body => {
    expect(() => validatePlatformCheckoutBody(body)).toThrowError(CheckoutServiceError)
  })

  it('requires an empty coach body and preserves webhook-compatible metadata', () => {
    expect(validateCoachCheckoutBody({})).toBeUndefined()
    expect(() => validateCoachCheckoutBody({ clientId: 'foreign' })).toThrowError(CheckoutServiceError)
    expect(buildPlatformMetadata(CLIENT_ID, resolvePlatformPlan('client_yearly'))).toEqual({
      clientId: CLIENT_ID, planId: 'client_yearly', coachId: 'platform', subType: 'client_yearly',
    })
    expect(buildCoachMetadata(CLIENT_ID, COACH_ID)).toEqual({
      clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription',
    })
  })
})

describe('createPlatformCheckout', () => {
  let stripe: ReturnType<typeof stripePort>

  beforeEach(() => { stripe = stripePort() })

  it('creates the unchanged platform session then writes its pending payment', async () => {
    const repository = platformRepository()
    const result = await createPlatformCheckout({
      userId: CLIENT_ID,
      body: { planId: 'client_monthly' },
      stripeConfigured: true,
      stripe: () => stripe.port,
      repository,
      priceIds: { client_monthly: 'price_client_monthly' },
      appUrl: 'http://127.0.0.1:3210',
      nowMs: () => 123,
    })

    expect(result).toEqual({ url: 'https://checkout.test/session' })
    expect(stripe.createSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      line_items: [{ price: 'price_client_monthly', quantity: 1 }],
      success_url: 'http://127.0.0.1:3210/?payment=success',
      cancel_url: 'http://127.0.0.1:3210/?payment=cancel',
      metadata: { clientId: CLIENT_ID, planId: 'client_monthly', coachId: 'platform', subType: 'client_monthly' },
      subscription_data: { metadata: { clientId: CLIENT_ID, subType: 'client_monthly' } },
    }), `checkout-${CLIENT_ID}-client_monthly-123`)
    expect(repository.insertPendingPayment).toHaveBeenCalledWith(expect.objectContaining({
      client_id: CLIENT_ID, coach_id: null, stripe_checkout_session_id: 'cs_test', status: 'pending',
    }))
  })

  it('rejects an incompatible role and an unknown plan before Stripe', async () => {
    await expectCode(createPlatformCheckout({
      userId: CLIENT_ID, body: { planId: 'coach_monthly' }, stripeConfigured: true,
      stripe: () => stripe.port, repository: platformRepository(),
      priceIds: { coach_monthly: 'price_coach' }, appUrl: 'http://app.test',
    }), 'ROLE_FORBIDDEN')
    await expectCode(createPlatformCheckout({
      userId: CLIENT_ID, body: { planId: 'unknown' }, stripeConfigured: true,
      stripe: () => stripe.port, repository: platformRepository(),
      priceIds: {}, appUrl: 'http://app.test',
    }), 'INVALID_PLAN')
    expect(stripe.createSession).not.toHaveBeenCalled()
  })

  it('does not write a local payment when Stripe fails', async () => {
    stripe.createSession.mockRejectedValueOnce(new Error('provider unavailable'))
    const repository = platformRepository()
    await expect(createPlatformCheckout({
      userId: CLIENT_ID, body: { planId: 'client_monthly' }, stripeConfigured: true,
      stripe: () => stripe.port, repository,
      priceIds: { client_monthly: 'price_client_monthly' }, appUrl: 'http://app.test',
    })).rejects.toThrow('provider unavailable')
    expect(repository.insertPendingPayment).not.toHaveBeenCalled()
  })
})

describe('createCoachCheckout', () => {
  let stripe: ReturnType<typeof stripePort>

  beforeEach(() => { stripe = stripePort() })

  it('creates the unchanged coach session from the active server relationship', async () => {
    const result = await createCoachCheckout({
      clientId: CLIENT_ID,
      body: {},
      stripeConfigured: true,
      stripe: () => stripe.port,
      repository: coachRepository(),
      appUrl: 'http://127.0.0.1:3210',
      nowMs: () => 456,
    })

    expect(result).toEqual({ url: 'https://checkout.test/session' })
    expect(stripe.createSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      customer: 'cus_existing',
      success_url: 'http://127.0.0.1:3210/?payment=success',
      cancel_url: 'http://127.0.0.1:3210/?payment=canceled',
      metadata: { clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription' },
      subscription_data: expect.objectContaining({
        application_fee_percent: 3,
        transfer_data: { destination: 'acct_coach' },
      }),
    }), `coach-checkout-${CLIENT_ID}-${COACH_ID}-456`)
  })

  it('fails closed for zero or multiple active relations before Stripe', async () => {
    await expectCode(createCoachCheckout({
      clientId: CLIENT_ID, body: {}, stripeConfigured: true, stripe: () => stripe.port,
      repository: coachRepository({ findUniqueActiveCoachId: vi.fn(async () => null) }),
      appUrl: 'http://app.test',
    }), 'RELATION_FORBIDDEN')
    expect(stripe.createSession).not.toHaveBeenCalled()
    expect(stripe.createCustomer).not.toHaveBeenCalled()
  })

  it('rejects a coach without a Connect account before Stripe', async () => {
    await expectCode(createCoachCheckout({
      clientId: CLIENT_ID, body: {}, stripeConfigured: true, stripe: () => stripe.port,
      repository: coachRepository({
        findCoach: vi.fn(async () => ({ role: 'coach', stripeAccountId: null, monthlyRate: 75, fullName: 'Coach Test' })),
      }),
      appUrl: 'http://app.test',
    }), 'COACH_STRIPE_MISSING')
    expect(stripe.createSession).not.toHaveBeenCalled()
  })
})
