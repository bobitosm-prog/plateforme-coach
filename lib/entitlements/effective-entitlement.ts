import type { LegacyEntitlement } from './legacy-entitlements'

export type EffectiveEntitlementType =
  | 'paid'
  | 'lifetime'
  | 'beta'
  | 'legacy_invited'
  | 'trial'
  | 'free'

export type EffectiveEntitlementSource =
  | 'subscription'
  | 'legacy_entitlement'
  | 'beta'

export type EffectiveEntitlement = {
  type: EffectiveEntitlementType
  source: EffectiveEntitlementSource
}

export type EffectiveEntitlementInput = {
  subscriptionType: string | null | undefined
  legacyEntitlements?: readonly LegacyEntitlement[]
  now?: Date
}

const PAID_SUBSCRIPTION_TYPES = new Set([
  'client_monthly',
  'client_yearly',
  'coach_monthly',
  'coach_paid',
])

const LIFETIME_SUBSCRIPTION_TYPES = new Set([
  'lifetime',
  'client_lifetime',
])

function isActiveLegacyEntitlement(
  entitlement: LegacyEntitlement,
  now: Date,
): boolean {
  if (
    entitlement.type !== 'legacy_invited_access'
    || entitlement.active !== true
    || entitlement.revokedAt != null
  ) {
    return false
  }

  const startsAt = entitlement.startsAt.getTime()
  const endsAt = entitlement.endsAt?.getTime()
  const nowTime = now.getTime()
  return !Number.isNaN(startsAt)
    && startsAt <= nowTime
    && (endsAt == null || (
      !Number.isNaN(endsAt)
      && endsAt > startsAt
      && endsAt > nowTime
    ))
}

/**
 * Resolves product authority only. Coaching workflow state is deliberately
 * outside this contract.
 */
export function resolveEffectiveEntitlement({
  subscriptionType,
  legacyEntitlements = [],
  now = new Date(),
}: EffectiveEntitlementInput): EffectiveEntitlement {
  if (subscriptionType && PAID_SUBSCRIPTION_TYPES.has(subscriptionType)) {
    return { type: 'paid', source: 'subscription' }
  }

  if (subscriptionType && LIFETIME_SUBSCRIPTION_TYPES.has(subscriptionType)) {
    return { type: 'lifetime', source: 'subscription' }
  }

  if (subscriptionType === 'beta') {
    return { type: 'beta', source: 'beta' }
  }

  if (legacyEntitlements.some(entitlement => (
    isActiveLegacyEntitlement(entitlement, now)
  ))) {
    return { type: 'legacy_invited', source: 'legacy_entitlement' }
  }

  // Transitional fallback: historical invited profiles keep their existing
  // restrictions until all callers provide persisted legacy entitlements.
  if (subscriptionType === 'invited') {
    return { type: 'legacy_invited', source: 'subscription' }
  }

  if (subscriptionType === 'trial') {
    return { type: 'trial', source: 'subscription' }
  }

  return { type: 'free', source: 'subscription' }
}
