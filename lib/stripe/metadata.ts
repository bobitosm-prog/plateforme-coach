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

  // ── isCoachSubscription ──
  const isCoachSubscription = metadata.type === 'coach_subscription'

  // ── coachId ──
  const rawCoachId = metadata.coachId
  let coachId: string | null = null
  if (rawCoachId && rawCoachId !== 'platform') {
    if (!UUID_RE.test(rawCoachId)) {
      return { ok: false, reason: `invalid coachId: ${rawCoachId.slice(0, 50)}` }
    }
    coachId = rawCoachId
  }

  if (isCoachSubscription && (subType !== 'coach_monthly' || !coachId)) {
    return { ok: false, reason: 'coach subscription metadata mismatch' }
  }
  if (!isCoachSubscription && coachId) {
    return { ok: false, reason: 'unexpected coachId for platform checkout' }
  }

  return { ok: true, clientId, subType, isCoachSubscription, coachId }
}
