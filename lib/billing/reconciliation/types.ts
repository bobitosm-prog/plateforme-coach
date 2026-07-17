export type ReconciliationSeverity = 'warning' | 'critical'

export type ReconciliationSource =
  | 'webhook'
  | 'payment'
  | 'profile'
  | 'subscription'
  | 'checkout'
  | 'connect'
  | 'stripe'

export type ReconciliationRecommendation =
  | 'RETRY_WEBHOOK'
  | 'INSPECT_PAYMENT'
  | 'VERIFY_CUSTOMER'
  | 'VERIFY_SUBSCRIPTION'
  | 'REPLAY_CHECKOUT_EVENT'
  | 'COMPLETE_CONNECT_ONBOARDING'
  | 'RETRY_STRIPE_AUDIT'

export type ReconciliationIssueCode =
  | 'WEBHOOK_FAILED_STALE'
  | 'WEBHOOK_PROCESSING_STALE'
  | 'PAYMENT_MISSING_FOR_EVENT'
  | 'PAYMENT_EVENT_ID_MISSING'
  | 'PAYMENT_EVENT_ID_DUPLICATED'
  | 'PROFILE_CUSTOMER_ID_MISSING'
  | 'STRIPE_CUSTOMER_NOT_FOUND'
  | 'STRIPE_SUBSCRIPTION_NOT_FOUND'
  | 'SUBSCRIPTION_CUSTOMER_DIVERGED'
  | 'SUBSCRIPTION_STATUS_DIVERGED'
  | 'SUBSCRIPTION_STATUS_UNKNOWN'
  | 'CHECKOUT_WEBHOOK_MISSING'
  | 'CONNECT_ACCOUNT_INCOMPLETE'
  | 'CONNECT_ACCOUNT_NOT_FOUND'
  | 'STRIPE_READ_FAILED'

export interface ReconciliationIssue {
  code: ReconciliationIssueCode
  severity: ReconciliationSeverity
  source: ReconciliationSource
  entityRef: string
  recommendation: ReconciliationRecommendation
  summary: string
  context?: Readonly<Record<string, string | number | boolean | null>>
}

export interface ReconciliationReport {
  generatedAt: string
  readOnly: true
  scanned: {
    webhookEvents: number
    payments: number
    profiles: number
    completedCheckouts: number
  }
  issues: ReconciliationIssue[]
  truncated: boolean
  partial: boolean
}

export interface LocalWebhookEvent {
  eventId: string
  eventType: string
  status: string
  processedAt: string
  processingStartedAt: string | null
  objectId: string | null
}

export interface LocalPayment {
  id: string
  stripeEventId: string | null
  checkoutSessionId: string | null
  status: string | null
}

export interface LocalBillingProfile {
  id: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeAccountId: string | null
  subscriptionStatus: string | null
}

export interface ReconciliationSnapshot {
  webhookEvents: LocalWebhookEvent[]
  payments: LocalPayment[]
  profiles: LocalBillingProfile[]
}

export type StripeReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'not_found' | 'unavailable' }

export interface StripeSubscriptionAudit {
  status: string
  customerId: string | null
}

export interface StripeConnectAudit {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

export interface StripeCompletedCheckout {
  id: string
}

export interface BillingReconciliationRepository {
  readSnapshot(input: { limit: number }): Promise<ReconciliationSnapshot>
}

export interface BillingReconciliationStripePort {
  retrieveCustomer(customerId: string): Promise<StripeReadResult<{ deleted: boolean }>>
  retrieveSubscription(subscriptionId: string): Promise<StripeReadResult<StripeSubscriptionAudit>>
  retrieveConnectAccount(accountId: string): Promise<StripeReadResult<StripeConnectAudit>>
  listRecentCompletedCheckouts(input: { limit: number }): Promise<StripeReadResult<StripeCompletedCheckout[]>>
}
