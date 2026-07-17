/**
 * Pure validation of Stripe checkout session metadata.
 * Zero external dependencies — testable in Node without env.
 */

export const VALID_SUB_TYPES = [
  'client_monthly',
  'client_yearly',
  'client_lifetime',
  'coach_monthly',
] as const

export type SubType = typeof VALID_SUB_TYPES[number]

export const STRIPE_METADATA_KEYS = {
  clientId: 'clientId',
  coachId: 'coachId',
  planId: 'planId',
  subType: 'subType',
  type: 'type',
} as const

export const COACH_SUBSCRIPTION_TYPE = 'coach_subscription' as const
export const PLATFORM_COACH_ID = 'platform' as const

export type PlatformCheckoutMetadata = {
  clientId: string
  planId: SubType
  coachId: typeof PLATFORM_COACH_ID
  subType: SubType
}

export type CoachCheckoutMetadata = {
  clientId: string
  coachId: string
  subType: 'coach_monthly'
  type: typeof COACH_SUBSCRIPTION_TYPE
}

export type SubscriptionMetadata = {
  clientId: string
  subType: SubType
}

export function buildPlatformCheckoutMetadata(clientId: string, subType: SubType): PlatformCheckoutMetadata {
  return { clientId, planId: subType, coachId: PLATFORM_COACH_ID, subType }
}

export function buildCoachCheckoutMetadata(clientId: string, coachId: string): CoachCheckoutMetadata {
  return { clientId, coachId, subType: 'coach_monthly', type: COACH_SUBSCRIPTION_TYPE }
}

export function buildSubscriptionMetadata(clientId: string, subType: SubType): SubscriptionMetadata {
  return { clientId, subType }
}

export function buildCoachCustomerMetadata(clientId: string, coachId: string) {
  return { userId: clientId, coachId }
}

/** UUID v4 regex — case-insensitive, anchored */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ParseOk = {
  ok: true
  clientId: string
  subType: SubType
  isCoachSubscription: boolean
  coachId: string | null
}

type ParseFail = { ok: false; reason: string }

function hasExactKeys(metadata: Record<string, string>, expected: readonly string[]): boolean {
  const actual = Object.keys(metadata).sort()
  const canonical = [...expected].sort()
  return actual.length === canonical.length && actual.every((key, index) => key === canonical[index])
}

/**
 * Parse and validate metadata from a Stripe checkout session.
 *
 * Rules:
 * - clientId: required UUID (profiles.id is always UUID v4)
 * - subType: metadata.subType is required and must be known
 *   (prevents arbitrary strings landing in profiles.subscription_type)
 * - isCoachSubscription: strict equality on metadata.type
 * - coachId: 'platform' or absent → null; otherwise must be UUID
 *   (coach_id FK on payments requires valid UUID)
 */
export function parseCheckoutMetadata(
  metadata: Record<string, string> | null | undefined
): ParseOk | ParseFail {
  if (!metadata) return { ok: false, reason: 'metadata is null' }

  // ── clientId ──
  const clientId = metadata.clientId
  if (!clientId || !UUID_RE.test(clientId)) {
    return { ok: false, reason: `invalid clientId: ${String(clientId).slice(0, 50)}` }
  }

  // ── subType ──
  const rawSubType = metadata.subType
  if (!rawSubType || !(VALID_SUB_TYPES as readonly string[]).includes(rawSubType)) {
    return { ok: false, reason: `unknown subType: ${String(rawSubType).slice(0, 50)}` }
  }
  const subType = rawSubType as SubType

  // ── contract shape ──
  const isCoachSubscription = metadata.type === COACH_SUBSCRIPTION_TYPE
  const expectedKeys = isCoachSubscription
    ? [STRIPE_METADATA_KEYS.clientId, STRIPE_METADATA_KEYS.coachId, STRIPE_METADATA_KEYS.subType, STRIPE_METADATA_KEYS.type]
    : [STRIPE_METADATA_KEYS.clientId, STRIPE_METADATA_KEYS.coachId, STRIPE_METADATA_KEYS.planId, STRIPE_METADATA_KEYS.subType]
  if (!hasExactKeys(metadata, expectedKeys)) {
    return { ok: false, reason: 'metadata keys mismatch' }
  }

  // ── coachId ──
  const rawCoachId = metadata.coachId
  let coachId: string | null = null
  if (rawCoachId && rawCoachId !== PLATFORM_COACH_ID) {
    if (!UUID_RE.test(rawCoachId)) {
      return { ok: false, reason: `invalid coachId: ${rawCoachId.slice(0, 50)}` }
    }
    coachId = rawCoachId
  }

  if (isCoachSubscription && (subType !== 'coach_monthly' || !coachId)) {
    return { ok: false, reason: 'coach subscription metadata mismatch' }
  }
  if (!isCoachSubscription && (coachId || rawCoachId !== PLATFORM_COACH_ID || metadata.planId !== subType)) {
    return { ok: false, reason: 'platform checkout metadata mismatch' }
  }

  return { ok: true, clientId, subType, isCoachSubscription, coachId }
}
