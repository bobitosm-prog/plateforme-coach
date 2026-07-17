export type PaymentState =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'partially_refunded'
  | 'refunded'
  | 'canceled'
  | 'unknown'

export type SubscriptionState =
  | 'none'
  | 'pending'
  | 'active'
  | 'past_due'
  | 'cancel_scheduled'
  | 'canceled'
  | 'expired'
  | 'unknown'

export type ProductAccessState =
  | 'none'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked'
  | 'unknown'

export type ProductKind = 'client_platform' | 'coach_platform' | 'coach_service'

export type BillingPlan =
  | 'client_monthly'
  | 'client_yearly'
  | 'client_lifetime'
  | 'coach_monthly'
  | 'coach_service_monthly'

export interface VerifiedPeriod {
  startsAt: string | null
  endsAt: string | null
  verified: boolean
}

interface SubscriptionBase {
  id: string
  state: SubscriptionState
  product: ProductKind
  period: VerifiedPeriod
}

export interface PlatformSubscription extends SubscriptionBase {
  kind: 'platform'
  userId: string
  product: 'client_platform' | 'coach_platform'
}

export interface CoachSubscription extends SubscriptionBase {
  kind: 'coach_service'
  clientId: string
  coachId: string
  product: 'coach_service'
}

export type BillingSubscription = PlatformSubscription | CoachSubscription

export interface ProductEntitlement {
  id: string
  subjectId: string
  product: ProductKind
  state: ProductAccessState
  validFrom: string | null
  validUntil: string | null
  periodVerified: boolean
  coachId?: string | null
}

export type CoachClientRelationshipState = 'active' | 'inactive' | 'missing' | 'unknown'

export type AccessDecisionReason =
  | 'ENTITLEMENT_ACTIVE'
  | 'SUBSCRIPTION_ACTIVE'
  | 'RELATIONSHIP_NOT_ACTIVE'
  | 'SUBSCRIPTION_SCOPE_MISMATCH'
  | 'ENTITLEMENT_SCOPE_MISMATCH'
  | 'PAYMENT_NOT_AUTHORITY'
  | 'ACCESS_NOT_ACTIVE'

export type AccessDecision =
  | { allowed: true; reason: 'ENTITLEMENT_ACTIVE' | 'SUBSCRIPTION_ACTIVE' }
  | { allowed: false; reason: Exclude<AccessDecisionReason, 'ENTITLEMENT_ACTIVE' | 'SUBSCRIPTION_ACTIVE'> }

const PAYMENT_STATES = new Set<PaymentState>([
  'pending', 'paid', 'failed', 'partially_refunded', 'refunded', 'canceled', 'unknown',
])

const SUBSCRIPTION_STATES = new Set<SubscriptionState>([
  'none', 'pending', 'active', 'past_due', 'cancel_scheduled', 'canceled', 'expired', 'unknown',
])

const PRODUCT_ACCESS_STATES = new Set<ProductAccessState>([
  'none', 'active', 'suspended', 'expired', 'revoked', 'unknown',
])

export function normalizePaymentState(value: string | null | undefined): PaymentState {
  if (value === 'succeeded' || value === 'completed') return 'paid'
  return value && PAYMENT_STATES.has(value as PaymentState) ? value as PaymentState : 'unknown'
}

export function normalizeSubscriptionState(value: string | null | undefined): SubscriptionState {
  if (!value) return 'none'
  if (value === 'trialing') return 'active'
  return SUBSCRIPTION_STATES.has(value as SubscriptionState) ? value as SubscriptionState : 'unknown'
}

export function normalizeProductAccessState(value: string | null | undefined): ProductAccessState {
  if (!value) return 'none'
  return PRODUCT_ACCESS_STATES.has(value as ProductAccessState) ? value as ProductAccessState : 'unknown'
}

export function isPaymentSuccessful(value: PaymentState | string | null | undefined): boolean {
  return normalizePaymentState(value) === 'paid'
}

function parseTime(value: string | null): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function isVerifiedPeriodActive(period: VerifiedPeriod, now: Date): boolean {
  if (!period.verified) return false
  const end = parseTime(period.endsAt)
  if (end === null || end <= now.getTime()) return false
  const start = parseTime(period.startsAt)
  return period.startsAt === null || (start !== null && start <= now.getTime())
}

export function isSubscriptionActive(subscription: BillingSubscription, now: Date): boolean {
  const state = normalizeSubscriptionState(subscription.state)
  return state === 'active' && isVerifiedPeriodActive(subscription.period, now)
}

export function isProductEntitlementActive(entitlement: ProductEntitlement, now: Date): boolean {
  if (normalizeProductAccessState(entitlement.state) !== 'active' || !entitlement.periodVerified) return false
  const start = parseTime(entitlement.validFrom)
  if (entitlement.validFrom !== null && (start === null || start > now.getTime())) return false
  const end = parseTime(entitlement.validUntil)
  return entitlement.validUntil === null || (end !== null && end > now.getTime())
}

export interface ProductAccessInput {
  product: ProductKind
  now: Date
  entitlement?: ProductEntitlement | null
  subscription?: BillingSubscription | null
  paymentState?: PaymentState | string | null
}

export function decideProductAccess(input: ProductAccessInput): AccessDecision {
  if (input.entitlement?.product === input.product && isProductEntitlementActive(input.entitlement, input.now)) {
    return { allowed: true, reason: 'ENTITLEMENT_ACTIVE' }
  }
  if (input.subscription?.product === input.product && isSubscriptionActive(input.subscription, input.now)) {
    return { allowed: true, reason: 'SUBSCRIPTION_ACTIVE' }
  }
  if (isPaymentSuccessful(input.paymentState)) {
    return { allowed: false, reason: 'PAYMENT_NOT_AUTHORITY' }
  }
  return { allowed: false, reason: 'ACCESS_NOT_ACTIVE' }
}

export interface CoachProductAccessInput extends Omit<ProductAccessInput, 'product'> {
  clientId: string
  coachId: string
  relationship: CoachClientRelationshipState
}

export function decideCoachProductAccess(input: CoachProductAccessInput): AccessDecision {
  if (input.relationship !== 'active') {
    return { allowed: false, reason: 'RELATIONSHIP_NOT_ACTIVE' }
  }

  const subscription = input.subscription
  if (subscription && (
    subscription.kind !== 'coach_service'
    || subscription.clientId !== input.clientId
    || subscription.coachId !== input.coachId
  )) {
    return { allowed: false, reason: 'SUBSCRIPTION_SCOPE_MISMATCH' }
  }

  const entitlement = input.entitlement
  if (entitlement && (
    entitlement.subjectId !== input.clientId
    || entitlement.coachId !== input.coachId
  )) {
    return { allowed: false, reason: 'ENTITLEMENT_SCOPE_MISMATCH' }
  }

  return decideProductAccess({
    product: 'coach_service',
    now: input.now,
    subscription,
    entitlement,
    paymentState: input.paymentState,
  })
}
