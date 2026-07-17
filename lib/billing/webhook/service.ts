import type Stripe from 'stripe'
import { parseCheckoutMetadata } from '@/lib/stripe/metadata'

export const SUPPORTED_WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'invoice.payment_succeeded',
  'customer.subscription.deleted',
  'account.updated',
])

export type WebhookFailureReason = 'INVALID_METADATA' | 'WEBHOOK_PROCESSING_FAILED'

export class WebhookHandlerError extends Error {
  constructor(
    message: string,
    public readonly reason: WebhookFailureReason = 'WEBHOOK_PROCESSING_FAILED',
  ) {
    super(message)
    this.name = 'WebhookHandlerError'
  }
}

export interface WebhookStripePort {
  retrieveCheckoutSession(id: string): Promise<Stripe.Checkout.Session>
  retrieveSubscription(id: string): Promise<Stripe.Subscription>
  retrieveInvoice(id: string): Promise<Stripe.Invoice>
}

export interface WebhookBillingRepository {
  findBeneficiary(clientId: string): Promise<{ id: string; role: string | null } | null>
  hasActiveCoachRelation(clientId: string, coachId: string): Promise<boolean>
  findPlatformPaymentOwner(sessionId: string): Promise<{ clientId: string; coachId: string | null } | null>
  updateProfileById(clientId: string, updates: Record<string, unknown>): Promise<void>
  updateProfilesByCustomer(customerId: string, updates: Record<string, unknown>): Promise<void>
  findProfileByCustomer(customerId: string): Promise<{ id: string; subscriptionType: string | null } | null>
  updateProfileByConnectAccount(accountId: string, updates: Record<string, unknown>): Promise<void>
  upsertPayment(payment: Record<string, unknown>): Promise<void>
  markPaymentPaid(sessionId: string, paidAt: string): Promise<void>
}

export interface WebhookHandlerDependencies {
  stripe: WebhookStripePort
  repository: WebhookBillingRepository
  now?: () => Date
}

const daysAfter = (now: Date, days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

async function handleCheckoutCompleted(event: Stripe.Event, deps: WebhookHandlerDependencies) {
  const session = await deps.stripe.retrieveCheckoutSession((event.data.object as Stripe.Checkout.Session).id)
  const metadata = parseCheckoutMetadata(session.metadata as Record<string, string> | null)
  if (!metadata.ok) throw new WebhookHandlerError(`Invalid checkout metadata: ${metadata.reason}`, 'INVALID_METADATA')

  const { clientId, subType, isCoachSubscription, coachId } = metadata
  const beneficiary = await deps.repository.findBeneficiary(clientId)
  if (!beneficiary) throw new WebhookHandlerError('Checkout beneficiary not found')
  const requiredRole = subType === 'coach_monthly' && !isCoachSubscription ? 'coach' : 'client'
  if (beneficiary.role !== requiredRole) throw new WebhookHandlerError('Checkout offer/role mismatch')

  if (isCoachSubscription) {
    if (subType !== 'coach_monthly' || !coachId) throw new WebhookHandlerError('Invalid coach checkout metadata', 'INVALID_METADATA')
    if (!await deps.repository.hasActiveCoachRelation(clientId, coachId)) {
      throw new WebhookHandlerError('Coach relation mismatch')
    }
  } else {
    if (coachId) throw new WebhookHandlerError('Unexpected coach authority for platform checkout')
    const payment = await deps.repository.findPlatformPaymentOwner(session.id)
    if (!payment || payment.clientId !== clientId || payment.coachId !== null) {
      throw new WebhookHandlerError('Checkout payment ownership mismatch')
    }
  }

  const now = (deps.now || (() => new Date()))()
  if (isCoachSubscription && coachId) {
    await deps.repository.updateProfileById(clientId, {
      stripe_customer_id: session.customer as string || null,
      subscription_status: 'active',
      subscription_type: 'coach_paid',
      stripe_subscription_id: session.subscription as string || null,
      subscription_end_date: daysAfter(now, 30),
    })
    await deps.repository.upsertPayment({
      client_id: clientId,
      coach_id: coachId,
      amount: (session.amount_total || 0) / 100,
      currency: 'chf',
      description: 'Abonnement coaching mensuel',
      status: 'paid',
      paid_at: now.toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_event_id: event.id,
    })
  } else {
    const updates: Record<string, unknown> = {
      stripe_customer_id: session.customer as string || null,
      subscription_type: subType,
    }
    if (subType === 'client_lifetime') {
      updates.subscription_status = 'lifetime'
      updates.subscription_end_date = null
    } else {
      updates.subscription_status = 'active'
      updates.subscription_end_date = daysAfter(now, subType === 'client_yearly' ? 365 : 30)
      updates.stripe_subscription_id = session.subscription as string || null
    }
    if (subType === 'coach_monthly') updates.coach_subscription_active = true
    await deps.repository.updateProfileById(clientId, updates)
  }
  await deps.repository.markPaymentPaid(session.id, now.toISOString())
}

async function handleSubscriptionUpdated(event: Stripe.Event, deps: WebhookHandlerDependencies) {
  const subscription = await deps.stripe.retrieveSubscription((event.data.object as Stripe.Subscription).id)
  if (!subscription.customer) return
  const status = subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : subscription.status
  await deps.repository.updateProfilesByCustomer(subscription.customer as string, { subscription_status: status })
}

async function handleInvoicePaid(event: Stripe.Event, deps: WebhookHandlerDependencies) {
  const invoice = await deps.stripe.retrieveInvoice((event.data.object as Stripe.Invoice).id)
  if (invoice.billing_reason !== 'subscription_cycle' || !invoice.customer) return
  const client = await deps.repository.findProfileByCustomer(invoice.customer as string)
  if (!client) return
  const now = (deps.now || (() => new Date()))()
  const interval = client.subscriptionType === 'client_yearly' ? 365 : 30
  await deps.repository.updateProfileById(client.id, {
    subscription_status: 'active',
    subscription_end_date: daysAfter(now, interval),
  })
  await deps.repository.upsertPayment({
    client_id: client.id,
    amount: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency || 'chf',
    description: `Renouvellement ${client.subscriptionType === 'client_yearly' ? 'annuel' : client.subscriptionType === 'coach_monthly' ? 'coach' : 'mensuel'}`,
    status: 'paid',
    paid_at: now.toISOString(),
    stripe_event_id: event.id,
  })
}

async function handleSubscriptionDeleted(event: Stripe.Event, deps: WebhookHandlerDependencies) {
  const subscription = await deps.stripe.retrieveSubscription((event.data.object as Stripe.Subscription).id)
  if (!subscription.customer) return
  await deps.repository.updateProfilesByCustomer(subscription.customer as string, {
    subscription_status: 'canceled',
    stripe_subscription_id: null,
  })
}

async function handleAccountUpdated(event: Stripe.Event, deps: WebhookHandlerDependencies) {
  const account = event.data.object as Stripe.Account
  if (!account.charges_enabled || !account.payouts_enabled) return
  await deps.repository.updateProfileByConnectAccount(account.id, { stripe_onboarding_complete: true })
}

export async function processWebhookEvent(event: Stripe.Event, deps: WebhookHandlerDependencies): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': return handleCheckoutCompleted(event, deps)
    case 'customer.subscription.updated': return handleSubscriptionUpdated(event, deps)
    case 'invoice.payment_succeeded': return handleInvoicePaid(event, deps)
    case 'customer.subscription.deleted': return handleSubscriptionDeleted(event, deps)
    case 'account.updated': return handleAccountUpdated(event, deps)
    default: throw new WebhookHandlerError('Unsupported webhook event')
  }
}
