import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import { processWebhookEvent, type WebhookBillingRepository, type WebhookStripePort } from '@/lib/billing/webhook'
import { buildPlatformCheckoutMetadata } from '@/lib/stripe/metadata'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

function event(type: Stripe.Event.Type, id: string, objectId: string): Stripe.Event {
  return { id, type, data: { object: { id: objectId } } } as unknown as Stripe.Event
}

function statefulDependencies() {
  const profile = {
    id: CLIENT_ID,
    role: 'client',
    customerId: 'cus_1',
    subscriptionId: 'sub_new',
    subscriptionType: 'client_monthly',
    subscriptionStatus: 'active',
  }
  const payments = new Map<string, Record<string, unknown>>()
  const stripe: WebhookStripePort = {
    retrieveCheckoutSession: vi.fn(),
    retrieveSubscription: vi.fn(),
    retrieveInvoice: vi.fn(),
  }
  const repository: WebhookBillingRepository = {
    findBeneficiary: vi.fn(async id => id === profile.id ? { id, role: profile.role } : null),
    hasActiveCoachRelation: vi.fn(async () => false),
    findPlatformPaymentOwner: vi.fn(async () => ({ clientId: profile.id, coachId: null })),
    updateProfileById: vi.fn(async (id, updates) => {
      if (id !== profile.id) return
      if (typeof updates.subscription_status === 'string') profile.subscriptionStatus = updates.subscription_status
      if (typeof updates.subscription_type === 'string') profile.subscriptionType = updates.subscription_type
      if (typeof updates.stripe_subscription_id === 'string') profile.subscriptionId = updates.stripe_subscription_id
    }),
    updateSubscriptionByAuthority: vi.fn(async (customerId, subscriptionId, updates) => {
      if (customerId !== profile.customerId || subscriptionId !== profile.subscriptionId) return
      if (typeof updates.subscription_status === 'string') profile.subscriptionStatus = updates.subscription_status
      if (updates.stripe_subscription_id === null) profile.subscriptionId = ''
    }),
    findProfileBySubscription: vi.fn(async (customerId, subscriptionId) =>
      customerId === profile.customerId && subscriptionId === profile.subscriptionId
        ? { id: profile.id, subscriptionType: profile.subscriptionType }
        : null),
    updateProfileByConnectAccount: vi.fn(async () => undefined),
    upsertPayment: vi.fn(async payment => {
      const eventId = String(payment.stripe_event_id)
      if (!payments.has(eventId)) payments.set(eventId, payment)
    }),
    markPaymentPaid: vi.fn(async () => undefined),
  }
  return { profile, payments, stripe, repository, now: () => new Date('2026-07-17T12:00:00Z') }
}

describe('Billing webhook out-of-order delivery', () => {
  it('does not let an old subscription update overwrite the newer subscription authority', async () => {
    const deps = statefulDependencies()
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({
      id: 'sub_old', customer: 'cus_1', status: 'canceled',
    } as unknown as Stripe.Subscription)

    await processWebhookEvent(event('customer.subscription.updated', 'evt_old_update', 'sub_old'), deps)

    expect(deps.profile).toMatchObject({ subscriptionId: 'sub_new', subscriptionStatus: 'active' })
    expect(deps.repository.updateSubscriptionByAuthority).toHaveBeenCalledWith('cus_1', 'sub_old', { subscription_status: 'canceled' })
  })

  it('does not let an old deletion cancel a replacement subscription', async () => {
    const deps = statefulDependencies()
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({
      id: 'sub_old', customer: 'cus_1', status: 'canceled',
    } as unknown as Stripe.Subscription)

    await processWebhookEvent(event('customer.subscription.deleted', 'evt_old_delete', 'sub_old'), deps)

    expect(deps.profile).toMatchObject({ subscriptionId: 'sub_new', subscriptionStatus: 'active' })
  })

  it('records a delayed paid invoice without reactivating a canceled subscription', async () => {
    const deps = statefulDependencies()
    deps.profile.subscriptionStatus = 'canceled'
    vi.mocked(deps.stripe.retrieveInvoice).mockResolvedValue({
      id: 'in_late', customer: 'cus_1', billing_reason: 'subscription_cycle', amount_paid: 1000, currency: 'chf',
      parent: { subscription_details: { subscription: 'sub_new' } },
    } as unknown as Stripe.Invoice)
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({
      id: 'sub_new', customer: 'cus_1', status: 'canceled',
    } as unknown as Stripe.Subscription)

    await processWebhookEvent(event('invoice.payment_succeeded', 'evt_late_invoice', 'in_late'), deps)

    expect(deps.profile.subscriptionStatus).toBe('canceled')
    expect(deps.payments.has('evt_late_invoice')).toBe(true)
    expect(deps.repository.updateProfileById).not.toHaveBeenCalled()
  })

  it('marks a late checkout payment but does not restore access after Stripe cancellation', async () => {
    const deps = statefulDependencies()
    deps.profile.subscriptionStatus = 'canceled'
    vi.mocked(deps.stripe.retrieveCheckoutSession).mockResolvedValue({
      id: 'cs_late', customer: 'cus_1', subscription: 'sub_new', amount_total: 1000,
      metadata: buildPlatformCheckoutMetadata(CLIENT_ID, 'client_monthly'),
    } as unknown as Stripe.Checkout.Session)
    vi.mocked(deps.stripe.retrieveSubscription).mockResolvedValue({
      id: 'sub_new', customer: 'cus_1', status: 'canceled',
    } as unknown as Stripe.Subscription)

    await processWebhookEvent(event('checkout.session.completed', 'evt_late_checkout', 'cs_late'), deps)

    expect(deps.profile.subscriptionStatus).toBe('canceled')
    expect(deps.repository.updateProfileById).not.toHaveBeenCalled()
    expect(deps.repository.markPaymentPaid).toHaveBeenCalledOnce()
  })
})
