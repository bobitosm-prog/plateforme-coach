import { createHash } from 'node:crypto'
import type {
  BillingReconciliationRepository,
  BillingReconciliationStripePort,
  ReconciliationIssue,
  ReconciliationReport,
  ReconciliationSource,
  ReconciliationSnapshot,
  StripeReadResult,
} from './types'

const PAYMENT_EVENT_TYPES = new Set(['checkout.session.completed', 'invoice.payment_succeeded'])
const KNOWN_LOCAL_SUBSCRIPTION_STATUSES = new Set(['active', 'past_due', 'canceled', 'cancelled', 'inactive', 'lifetime'])
const KNOWN_STRIPE_SUBSCRIPTION_STATUSES = new Set(['active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused'])

function opaqueRef(source: ReconciliationSource, id: string): string {
  return `${source}:${createHash('sha256').update(id).digest('hex').slice(0, 12)}`
}

function safeStatus(value: string | null, known: Set<string>): string {
  return value && known.has(value) ? value : 'unknown'
}

function subscriptionStatusesMatch(local: string | null, remote: string): boolean {
  const normalizedLocal = local === 'cancelled' ? 'canceled' : local
  return normalizedLocal === remote
}

function timestampAgeMs(timestamp: string | null, nowMs: number): number | null {
  if (!timestamp) return null
  const value = Date.parse(timestamp)
  return Number.isFinite(value) ? Math.max(0, nowMs - value) : null
}

export interface ReconcileBillingInput {
  repository: BillingReconciliationRepository
  stripe: BillingReconciliationStripePort
  now?: () => Date
  staleAfterMs?: number
  limit?: number
  maxIssues?: number
}

export async function reconcileBillingAudit(input: ReconcileBillingInput): Promise<ReconciliationReport> {
  const now = (input.now || (() => new Date()))()
  const nowMs = now.getTime()
  const staleAfterMs = Math.max(60_000, input.staleAfterMs ?? 5 * 60_000)
  const limit = Math.min(500, Math.max(1, input.limit ?? 100))
  const maxIssues = Math.min(500, Math.max(1, input.maxIssues ?? 200))
  const snapshot = await input.repository.readSnapshot({ limit })
  const issues: ReconciliationIssue[] = []
  let truncated = false
  let partial = false

  const add = (issue: ReconciliationIssue) => {
    if (issues.length >= maxIssues) {
      truncated = true
      return
    }
    issues.push(issue)
  }

  auditLocalSnapshot(snapshot, nowMs, staleAfterMs, add)

  const stripeFailure = (source: ReconciliationSource, id: string, result: StripeReadResult<unknown>) => {
    if (result.ok) return false
    if (result.reason === 'unavailable') partial = true
    const notFoundContract = source === 'profile'
      ? { code: 'STRIPE_CUSTOMER_NOT_FOUND' as const, recommendation: 'VERIFY_CUSTOMER' as const }
      : source === 'subscription'
        ? { code: 'STRIPE_SUBSCRIPTION_NOT_FOUND' as const, recommendation: 'VERIFY_SUBSCRIPTION' as const }
        : source === 'connect'
          ? { code: 'CONNECT_ACCOUNT_NOT_FOUND' as const, recommendation: 'COMPLETE_CONNECT_ONBOARDING' as const }
          : { code: 'STRIPE_READ_FAILED' as const, recommendation: 'RETRY_STRIPE_AUDIT' as const }
    add({
      code: result.reason === 'not_found' ? notFoundContract.code : 'STRIPE_READ_FAILED',
      severity: result.reason === 'not_found' ? 'critical' : 'warning',
      source,
      entityRef: opaqueRef(source, id),
      recommendation: result.reason === 'not_found' ? notFoundContract.recommendation : 'RETRY_STRIPE_AUDIT',
      summary: result.reason === 'not_found' ? 'Stripe authority is missing' : 'Stripe authority could not be read',
      context: { providerResult: result.reason },
    })
    return true
  }

  for (const profile of snapshot.profiles.slice(0, limit)) {
    if (profile.stripeSubscriptionId && !profile.stripeCustomerId) {
      add({
        code: 'PROFILE_CUSTOMER_ID_MISSING', severity: 'critical', source: 'profile',
        entityRef: opaqueRef('profile', profile.id), recommendation: 'VERIFY_CUSTOMER',
        summary: 'Local subscription has no local Stripe customer authority',
      })
    }
    if (profile.stripeCustomerId) {
      const customer = await input.stripe.retrieveCustomer(profile.stripeCustomerId)
      if (!stripeFailure('profile', profile.id, customer) && customer.ok && customer.value.deleted) {
        add({
          code: 'STRIPE_CUSTOMER_NOT_FOUND', severity: 'critical', source: 'profile',
          entityRef: opaqueRef('profile', profile.id), recommendation: 'VERIFY_CUSTOMER',
          summary: 'Local profile references a deleted Stripe customer',
        })
      }
    }
    if (profile.stripeSubscriptionId) {
      const subscription = await input.stripe.retrieveSubscription(profile.stripeSubscriptionId)
      if (!stripeFailure('subscription', profile.id, subscription) && subscription.ok) {
        const localStatus = safeStatus(profile.subscriptionStatus, KNOWN_LOCAL_SUBSCRIPTION_STATUSES)
        const remoteStatus = safeStatus(subscription.value.status, KNOWN_STRIPE_SUBSCRIPTION_STATUSES)
        if (localStatus === 'unknown' || remoteStatus === 'unknown') {
          add({
            code: 'SUBSCRIPTION_STATUS_UNKNOWN', severity: 'warning', source: 'subscription',
            entityRef: opaqueRef('subscription', profile.id), recommendation: 'VERIFY_SUBSCRIPTION',
            summary: 'Subscription has an unknown status', context: { localStatus, remoteStatus },
          })
        } else if (!subscriptionStatusesMatch(localStatus, remoteStatus)) {
          add({
            code: 'SUBSCRIPTION_STATUS_DIVERGED', severity: 'critical', source: 'subscription',
            entityRef: opaqueRef('subscription', profile.id), recommendation: 'VERIFY_SUBSCRIPTION',
            summary: 'Local and Stripe subscription statuses diverge', context: { localStatus, remoteStatus },
          })
        }
        if (profile.stripeCustomerId && subscription.value.customerId && profile.stripeCustomerId !== subscription.value.customerId) {
          add({
            code: 'SUBSCRIPTION_CUSTOMER_DIVERGED', severity: 'critical', source: 'subscription',
            entityRef: opaqueRef('subscription', profile.id), recommendation: 'VERIFY_CUSTOMER',
            summary: 'Local customer and Stripe subscription customer diverge',
          })
        }
      }
    }
    if (profile.stripeAccountId) {
      const account = await input.stripe.retrieveConnectAccount(profile.stripeAccountId)
      if (!stripeFailure('connect', profile.id, account) && account.ok &&
        (!account.value.chargesEnabled || !account.value.payoutsEnabled || !account.value.detailsSubmitted)) {
        add({
          code: 'CONNECT_ACCOUNT_INCOMPLETE', severity: 'warning', source: 'connect',
          entityRef: opaqueRef('connect', profile.id), recommendation: 'COMPLETE_CONNECT_ONBOARDING',
          summary: 'Local Connect authority is not fully enabled',
          context: {
            chargesEnabled: account.value.chargesEnabled,
            payoutsEnabled: account.value.payoutsEnabled,
            detailsSubmitted: account.value.detailsSubmitted,
          },
        })
      }
    }
  }

  let completedCheckouts = 0
  const checkoutResult = await input.stripe.listRecentCompletedCheckouts({ limit })
  if (checkoutResult.ok) {
    completedCheckouts = checkoutResult.value.length
    const claimedCheckoutIds = new Set(snapshot.webhookEvents
      .filter(event => event.eventType === 'checkout.session.completed')
      .map(event => event.objectId)
      .filter((id): id is string => Boolean(id)))
    for (const checkout of checkoutResult.value.slice(0, limit)) {
      if (!claimedCheckoutIds.has(checkout.id)) {
        add({
          code: 'CHECKOUT_WEBHOOK_MISSING', severity: 'critical', source: 'checkout',
          entityRef: opaqueRef('checkout', checkout.id), recommendation: 'REPLAY_CHECKOUT_EVENT',
          summary: 'Completed Stripe checkout has no local webhook claim',
        })
      }
    }
  } else {
    stripeFailure('stripe', 'completed-checkouts', checkoutResult)
  }

  return {
    generatedAt: now.toISOString(), readOnly: true,
    scanned: {
      webhookEvents: snapshot.webhookEvents.length,
      payments: snapshot.payments.length,
      profiles: snapshot.profiles.length,
      completedCheckouts,
    },
    issues, truncated, partial,
  }
}

function auditLocalSnapshot(
  snapshot: ReconciliationSnapshot,
  nowMs: number,
  staleAfterMs: number,
  add: (issue: ReconciliationIssue) => void,
) {
  const paymentsByEvent = new Map<string, number>()
  for (const payment of snapshot.payments) {
    if (!payment.stripeEventId) {
      add({
        code: 'PAYMENT_EVENT_ID_MISSING', severity: 'warning', source: 'payment',
        entityRef: opaqueRef('payment', payment.id), recommendation: 'INSPECT_PAYMENT',
        summary: 'Local payment has no Stripe event authority',
      })
      continue
    }
    paymentsByEvent.set(payment.stripeEventId, (paymentsByEvent.get(payment.stripeEventId) || 0) + 1)
  }

  for (const [eventId, count] of paymentsByEvent) {
    if (count > 1) add({
      code: 'PAYMENT_EVENT_ID_DUPLICATED', severity: 'critical', source: 'payment',
      entityRef: opaqueRef('payment', eventId), recommendation: 'INSPECT_PAYMENT',
      summary: 'Multiple local payments share one Stripe event authority', context: { count },
    })
  }

  for (const event of snapshot.webhookEvents) {
    const ageMs = timestampAgeMs(event.processingStartedAt || event.processedAt, nowMs)
    if (event.status === 'failed' && ageMs !== null && ageMs >= staleAfterMs) {
      add({
        code: 'WEBHOOK_FAILED_STALE', severity: 'critical', source: 'webhook',
        entityRef: opaqueRef('webhook', event.eventId), recommendation: 'RETRY_WEBHOOK',
        summary: 'Failed webhook remains unrecovered', context: { ageSeconds: Math.floor(ageMs / 1000) },
      })
    }
    if (event.status === 'processing' && ageMs !== null && ageMs >= staleAfterMs) {
      add({
        code: 'WEBHOOK_PROCESSING_STALE', severity: 'critical', source: 'webhook',
        entityRef: opaqueRef('webhook', event.eventId), recommendation: 'RETRY_WEBHOOK',
        summary: 'Webhook processing lease is stale', context: { ageSeconds: Math.floor(ageMs / 1000) },
      })
    }
    if (event.status === 'success' && PAYMENT_EVENT_TYPES.has(event.eventType) && !paymentsByEvent.has(event.eventId)) {
      add({
        code: 'PAYMENT_MISSING_FOR_EVENT', severity: 'critical', source: 'payment',
        entityRef: opaqueRef('payment', event.eventId), recommendation: 'INSPECT_PAYMENT',
        summary: 'Successful payment-producing webhook has no local payment',
      })
    }
  }
}
