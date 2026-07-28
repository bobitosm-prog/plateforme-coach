import { createHash } from 'node:crypto'
import type {
  BillingReconciliationRepository,
  BillingReconciliationScope,
  BillingReconciliationStripePort,
  LocalWebhookEvent,
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
  scope?: BillingReconciliationScope
}

interface ReconciliationExclusions {
  historicalExcludedCount: number
  syntheticExcludedCount: number
  quarantinedExcludedCount: number
  ignoredInitialInvoiceCount: number
  pendingNotFinalizedCount: number
}

function emptyExclusions(): ReconciliationExclusions {
  return {
    historicalExcludedCount: 0,
    syntheticExcludedCount: 0,
    quarantinedExcludedCount: 0,
    ignoredInitialInvoiceCount: 0,
    pendingNotFinalizedCount: 0,
  }
}

function matchesPrefix(
  value: string | null | undefined,
  prefixes: readonly string[],
): boolean {
  return Boolean(value && prefixes.some(prefix => value.startsWith(prefix)))
}

function scopeLocalSnapshot(
  snapshot: ReconciliationSnapshot,
  scope: BillingReconciliationScope | undefined,
  exclusions: ReconciliationExclusions,
): ReconciliationSnapshot {
  if (!scope) return snapshot

  const isCurrentClient = (clientId: string | null | undefined) =>
    matchesPrefix(clientId, scope.currentClientIdPrefixes)
  const isQuarantinedClient = (clientId: string | null | undefined) =>
    matchesPrefix(clientId, scope.quarantinedClientIdPrefixes)
  const historicalCustomers = new Set(
    snapshot.profiles
      .filter(profile => isQuarantinedClient(profile.id))
      .map(profile => profile.stripeCustomerId)
      .filter((id): id is string => Boolean(id)),
  )
  const historicalSubscriptions = new Set(
    snapshot.profiles
      .filter(profile => isQuarantinedClient(profile.id))
      .map(profile => profile.stripeSubscriptionId)
      .filter((id): id is string => Boolean(id)),
  )

  for (const event of snapshot.webhookEvents) {
    if (!isQuarantinedClient(event.clientId)) continue
    if (event.customerId) historicalCustomers.add(event.customerId)
    if (event.subscriptionId) historicalSubscriptions.add(event.subscriptionId)
  }

  const webhookEvents = snapshot.webhookEvents.filter(event => {
    if (isCurrentClient(event.clientId)) return true
    if (scope.syntheticEventIds.includes(event.eventId)) {
      exclusions.syntheticExcludedCount += 1
      return false
    }
    if (
      isQuarantinedClient(event.clientId)
      || Boolean(event.customerId && historicalCustomers.has(event.customerId))
      || Boolean(
        event.subscriptionId
        && historicalSubscriptions.has(event.subscriptionId)
      )
    ) {
      exclusions.historicalExcludedCount += 1
      return false
    }
    return true
  })

  const payments = snapshot.payments.filter(payment => {
    if (!isQuarantinedClient(payment.clientId)) return true
    exclusions.quarantinedExcludedCount += 1
    return false
  })
  const profiles = snapshot.profiles.filter(profile => {
    if (!isQuarantinedClient(profile.id)) return true
    exclusions.quarantinedExcludedCount += 1
    return false
  })

  return { webhookEvents, payments, profiles }
}

export async function reconcileBillingAudit(input: ReconcileBillingInput): Promise<ReconciliationReport> {
  const now = (input.now || (() => new Date()))()
  const nowMs = now.getTime()
  const staleAfterMs = Math.max(60_000, input.staleAfterMs ?? 5 * 60_000)
  const limit = Math.min(500, Math.max(1, input.limit ?? 100))
  const maxIssues = Math.min(500, Math.max(1, input.maxIssues ?? 200))
  const rawSnapshot = await input.repository.readSnapshot({ limit })
  const exclusions = emptyExclusions()
  const snapshot = scopeLocalSnapshot(rawSnapshot, input.scope, exclusions)
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

  auditLocalSnapshot(snapshot, nowMs, staleAfterMs, exclusions, add)

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
    const claimedCheckoutIds = new Set(snapshot.webhookEvents
      .filter(event => event.eventType === 'checkout.session.completed')
      .map(event => event.objectId)
      .filter((id): id is string => Boolean(id)))
    for (const checkout of checkoutResult.value.slice(0, limit)) {
      const currentClient = matchesPrefix(
        checkout.clientId,
        input.scope?.currentClientIdPrefixes || [],
      )
      if (
        input.scope
        && matchesPrefix(
          checkout.clientId,
          input.scope.quarantinedClientIdPrefixes,
        )
      ) {
        exclusions.historicalExcludedCount += 1
        continue
      }
      if (
        input.scope?.excludeUncontractedCheckouts
        && !checkout.hasMoovxMetadata
        && !currentClient
      ) {
        exclusions.syntheticExcludedCount += 1
        continue
      }
      completedCheckouts += 1
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
    ...exclusions,
    issues, truncated, partial,
  }
}

function auditLocalSnapshot(
  snapshot: ReconciliationSnapshot,
  nowMs: number,
  staleAfterMs: number,
  exclusions: ReconciliationExclusions,
  add: (issue: ReconciliationIssue) => void,
) {
  const successfulCheckoutBySession = new Set(snapshot.webhookEvents
    .filter(event =>
      event.eventType === 'checkout.session.completed'
      && event.status === 'success'
      && event.objectId,
    )
    .map(event => event.objectId as string))
  const paymentsByEvent = new Map<string, number>()
  for (const payment of snapshot.payments) {
    if (!payment.stripeEventId) {
      if (
        payment.status === 'pending'
        && (
          !payment.checkoutSessionId
          || !successfulCheckoutBySession.has(payment.checkoutSessionId)
        )
      ) {
        exclusions.pendingNotFinalizedCount += 1
      } else if (payment.status === 'paid' || payment.status === 'pending') {
        add({
          code: 'PAYMENT_EVENT_ID_MISSING', severity: 'warning', source: 'payment',
          entityRef: opaqueRef('payment', payment.id), recommendation: 'INSPECT_PAYMENT',
          summary: 'Local payment has no Stripe event authority',
        })
      }
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
    if (event.status === 'failed') {
      add({
        code: 'WEBHOOK_FAILED_STALE', severity: 'critical', source: 'webhook',
        entityRef: opaqueRef('webhook', event.eventId), recommendation: 'RETRY_WEBHOOK',
        summary: 'Failed webhook remains unrecovered',
        context: { ageSeconds: ageMs === null ? 0 : Math.floor(ageMs / 1000) },
      })
    }
    if (event.status === 'processing' && ageMs !== null && ageMs >= staleAfterMs) {
      add({
        code: 'WEBHOOK_PROCESSING_STALE', severity: 'critical', source: 'webhook',
        entityRef: opaqueRef('webhook', event.eventId), recommendation: 'RETRY_WEBHOOK',
        summary: 'Webhook processing lease is stale', context: { ageSeconds: Math.floor(ageMs / 1000) },
      })
    }
    const ignoredInitialInvoice =
      event.eventType === 'invoice.payment_succeeded'
      && event.billingReason === 'subscription_create'
      && initialInvoiceHasCheckoutPayment(snapshot, event)
    if (ignoredInitialInvoice) {
      exclusions.ignoredInitialInvoiceCount += 1
    }
    if (
      event.status === 'success'
      && PAYMENT_EVENT_TYPES.has(event.eventType)
      && !ignoredInitialInvoice
      && !paymentsByEvent.has(event.eventId)
    ) {
      add({
        code: 'PAYMENT_MISSING_FOR_EVENT', severity: 'critical', source: 'payment',
        entityRef: opaqueRef('payment', event.eventId), recommendation: 'INSPECT_PAYMENT',
        summary: 'Successful payment-producing webhook has no local payment',
      })
    }
  }
}

function initialInvoiceHasCheckoutPayment(
  snapshot: ReconciliationSnapshot,
  invoice: LocalWebhookEvent,
): boolean {
  if (!invoice.subscriptionId) return false
  const checkout = snapshot.webhookEvents.find(event =>
    event.eventType === 'checkout.session.completed'
    && event.status === 'success'
    && event.subscriptionId === invoice.subscriptionId
    && event.objectId,
  )
  if (!checkout?.objectId) return false
  return snapshot.payments.some(payment =>
    payment.status === 'paid'
    && (
      !checkout.clientId
      || !payment.clientId
      || checkout.clientId === payment.clientId
    )
    && (
      payment.stripeEventId === checkout.eventId
      || payment.checkoutSessionId === checkout.objectId
    ),
  )
}
