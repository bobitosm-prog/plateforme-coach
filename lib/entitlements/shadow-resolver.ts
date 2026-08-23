import {
  resolveUserCapabilities,
  type UserCapabilities,
} from './capabilities'
import type { LegacyEntitlement } from './legacy-entitlements'

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

const CAPABILITY_FIELDS = [
  'ai',
  'training',
  'nutrition',
  'coachManaged',
] as const satisfies readonly (keyof UserCapabilities)[]

type ShadowCapabilitySource = {
  subscriptionType: string | null | undefined
  legacyEntitlements?: readonly LegacyEntitlement[]
  now?: Date
}

export type CapabilityDifference = {
  field: keyof UserCapabilities
  current: boolean
  shadow: boolean
}

export type CapabilityComparison =
  | { status: 'MATCH'; differences: [] }
  | { status: 'DIFF'; differences: CapabilityDifference[] }

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

function hasHigherPrioritySubscription(
  subscriptionType: string | null | undefined,
): boolean {
  if (!subscriptionType) return false
  return PAID_SUBSCRIPTION_TYPES.has(subscriptionType)
    || LIFETIME_SUBSCRIPTION_TYPES.has(subscriptionType)
    || subscriptionType === 'beta'
}

/**
 * Computes a future candidate only. Nothing in the authorization path calls
 * this resolver. Priority is paid > lifetime > beta > legacy > trial > free.
 * The legacy subscription fallback remains intact when no active grant exists
 * so observation cannot alter today's result.
 */
export function resolveUserCapabilitiesShadow({
  subscriptionType,
  legacyEntitlements = [],
  now = new Date(),
}: ShadowCapabilitySource): UserCapabilities {
  const current = resolveUserCapabilities({ subscriptionType })
  if (hasHigherPrioritySubscription(subscriptionType)) return current

  const hasActiveLegacy = legacyEntitlements.some(entitlement => (
    isActiveLegacyEntitlement(entitlement, now)
  ))
  return hasActiveLegacy
    ? resolveUserCapabilities({ subscriptionType: 'invited' })
    : current
}

export function compareCapabilityResults(
  current: UserCapabilities,
  shadow: UserCapabilities,
): CapabilityComparison {
  const differences = CAPABILITY_FIELDS.flatMap(field => (
    current[field] === shadow[field]
      ? []
      : [{ field, current: current[field], shadow: shadow[field] }]
  ))

  return differences.length === 0
    ? { status: 'MATCH', differences: [] }
    : { status: 'DIFF', differences }
}
