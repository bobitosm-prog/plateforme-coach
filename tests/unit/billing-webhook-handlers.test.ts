import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import {
  processWebhookEvent,
  WebhookHandlerError,
  type WebhookBillingRepository,
  type WebhookStripePort,
} from '@/lib/billing/webhook'
import { buildPlatformCheckoutMetadata } from '@/lib/stripe/metadata'

const NOW = new Date('2026-07-17T12:00:00.000Z')
const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const COACH_ID = '33333333-3333-4333-8333-333333333333'

function event(type: Stripe.Event.Type, object: Record<string, unknown>, id = 'evt_test'): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event
}

function dependencies() {
  const stripe: WebhookStripePort = {
    retrieveCheckoutSession: vi.fn(),
    retrieveSubscription: vi.fn(),
    retrieveInvoice: vi.fn(),
  }
  const repository: WebhookBillingRepository = {
    findBeneficiary: vi.fn(),
    hasActiveCoachRelation: vi.fn(),
    findPlatformPaymentOwner: vi.fn(),
    updateProfileById: vi.fn(),
    updateProfilesByCustomer: vi.fn(),
    findProfileByCustomer: vi.fn(),
    updateProfileByConnectAccount: vi.fn(),
    upsertPayment: vi.fn(),
    markPaymentPaid: vi.fn(),
  }
  return { stripe, repository, now: () => NOW }
}

describe('Billing webhook handlers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('re-reads a platform checkout and preserves its verified metadata contract', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveCheckoutSession).mockResolvedValue({
      id: 'cs_platform', customer: 'cus_client', subscription: 'sub_client', amount_total: 4900,
      metadata: buildPlatformCheckoutMetadata(CLIENT_ID, 'client_monthly'),
    } as unknown as Stripe.Checkout.Session)
    vi.mocked(deps.repository.findBeneficiary).mockResolvedValue({ id: CLIENT_ID, role: 'client' })
    vi.mocked(deps.repository.findPlatformPaymentOwner).mockResolvedValue({ clientId: CLIENT_ID, coachId: null })

    await processWebhookEvent(event('checkout.session.completed', { id: 'cs_platform' }), deps)

    expect(deps.stripe.retrieveCheckoutSession).toHaveBeenCalledWith('cs_platform')
    expect(deps.repository.updateProfileById).toHaveBeenCalledWith(CLIENT_ID, expect.objectContaining({
      subscription_type: 'client_monthly', subscription_status: 'active', stripe_subscription_id: 'sub_client',
    }))
    expect(deps.repository.markPaymentPaid).toHaveBeenCalledWith('cs_platform', NOW.toISOString())
    expect(deps.repository.upsertPayment).not.toHaveBeenCalled()
  })

  it('requires an active server-side relation for a coach checkout', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveCheckoutSession).mockResolvedValue({
      id: 'cs_coach', customer: 'cus_client', subscription: 'sub_coach', amount_total: 12000,
      metadata: { clientId: CLIENT_ID, coachId: COACH_ID, subType: 'coach_monthly', type: 'coach_subscription' },
    } as unknown as Stripe.Checkout.Session)
    vi.mocked(deps.repository.findBeneficiary).mockResolvedValue({ id: CLIENT_ID, role: 'client' })
    vi.mocked(deps.repository.hasActiveCoachRelation).mockResolvedValue(true)

    await processWebhookEvent(event('checkout.session.completed', { id: 'cs_coach' }), deps)

    expect(deps.repository.hasActiveCoachRelation).toHaveBeenCalledWith(CLIENT_ID, COACH_ID)
    expect(deps.repository.upsertPayment).toHaveBeenCalledWith(expect.objectContaining({
      client_id: CLIENT_ID, coach_id: COACH_ID, stripe_event_id: 'evt_test', status: 'paid',
    }))
  })

  it('fails closed on invalid metadata before any mutation', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveCheckoutSession).mockResolvedValue({ id: 'cs_bad', metadata: { clientId: 'foreign' } } as unknown as Stripe.Checkout.Session)

    await expect(processWebhookEvent(event('checkout.session.completed', { id: 'cs_bad' }), deps))
      .rejects.toMatchObject({ reason: 'INVALID_METADATA' } satisfies Partial<WebhookHandlerError>)
    expect(deps.repository.updateProfileById).not.toHaveBeenCalled()
    expect(deps.repository.upsertPayment).not.toHaveBeenCalled()
    expect(deps.repository.markPaymentPaid).not.toHaveBeenCalled()
  })

  it('rejects foreign payment ownership and incompatible offers', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveCheckoutSession).mockResolvedValue({
      id: 'cs_platform', metadata: buildPlatformCheckoutMetadata(CLIENT_ID, 'client_monthly'),
    } as unknown as Stripe.Checkout.Session)
    vi.mocked(deps.repository.findBeneficiary).mockResolvedValue({ id: CLIENT_ID, role: 'client' })
    vi.mocked(deps.repository.findPlatformPaymentOwner).mockResolvedValue({ clientId: OTHER_CLIENT_ID, coachId: null })

    await expect(processWebhookEvent(event('checkout.session.completed', { id: 'cs_platform' }), deps))
      .rejects.toThrow('Checkout payment ownership mismatch')

    vi.mocked(deps.repository.findBeneficiary).mockResolvedValue({ id: CLIENT_ID, role: 'coach' })
    await expect(processWebhookEvent(event('checkout.session.completed', { id: 'cs_platform' }), deps))
      .rejects.toThrow('Checkout offer/role mismatch')
  })

  it('re-reads subscription and invoice objects before applying lifecycle changes', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({ id: 'sub_1', customer: 'cus_1', status: 'past_due' } as unknown as Stripe.Subscription)
    await processWebhookEvent(event('customer.subscription.updated', { id: 'sub_1' }), deps)
    expect(deps.repository.updateProfilesByCustomer).toHaveBeenCalledWith('cus_1', { subscription_status: 'past_due' })

    vi.mocked(deps.stripe.retrieveInvoice).mockResolvedValue({
      id: 'in_1', customer: 'cus_1', billing_reason: 'subscription_cycle', amount_paid: 9900, currency: 'chf',
    } as unknown as Stripe.Invoice)
    vi.mocked(deps.repository.findProfileByCustomer).mockResolvedValue({ id: CLIENT_ID, subscriptionType: 'client_yearly' })
    await processWebhookEvent(event('invoice.payment_succeeded', { id: 'in_1' }, 'evt_invoice'), deps)
    expect(deps.repository.updateProfileById).toHaveBeenCalledWith(CLIENT_ID, expect.objectContaining({ subscription_status: 'active' }))
    expect(deps.repository.upsertPayment).toHaveBeenCalledWith(expect.objectContaining({ stripe_event_id: 'evt_invoice', amount: 99 }))
  })

  it('handles cancellation and completed Connect onboarding without granting unrelated access', async () => {
    const deps = dependencies()
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({ id: 'sub_1', customer: 'cus_1' } as unknown as Stripe.Subscription)
    await processWebhookEvent(event('customer.subscription.deleted', { id: 'sub_1' }), deps)
    expect(deps.repository.updateProfilesByCustomer).toHaveBeenCalledWith('cus_1', {
      subscription_status: 'canceled', stripe_subscription_id: null,
    })

    await processWebhookEvent(event('account.updated', { id: 'acct_1', charges_enabled: true, payouts_enabled: true }), deps)
    expect(deps.repository.updateProfileByConnectAccount).toHaveBeenCalledWith('acct_1', { stripe_onboarding_complete: true })
    expect(deps.repository.markPaymentPaid).not.toHaveBeenCalled()
  })
})
