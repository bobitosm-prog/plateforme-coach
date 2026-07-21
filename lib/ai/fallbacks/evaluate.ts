import { getAiFallbackPolicy } from './registry'
import type { AiDegradedResult, AiFallbackContext, AiFallbackDecision, AiFallbackFeature, AiStaleCandidate, AiStaleValidation } from './types'

export function evaluateAiFallback(context: AiFallbackContext): AiFallbackDecision {
  const policy = getAiFallbackPolicy(context.feature)
  if (context.error === 'quota_exceeded') return { allowed: false, reason: 'quota_must_not_be_bypassed', policy }
  if (context.error === 'cancelled') return { allowed: false, reason: 'cancelled_must_not_fallback', policy }
  if (context.error === 'unexpected_error') return { allowed: false, reason: 'error_must_fail_closed', policy }

  if (context.stale) {
    if (!policy.allowedKinds.includes('stale_validated')) return { allowed: false, reason: 'stale_not_allowed', policy }
    const staleValidation = validateAiStaleCandidate(context.stale, context)
    if (!staleValidation.valid) return { allowed: false, reason: staleValidation.reason, policy }
    return { allowed: true, kind: 'stale_validated', reason: 'stale_validated', policy, stale: context.stale }
  }

  if (policy.disposition === 'explicit_partial') {
    if (!context.validFragments?.length) return { allowed: false, reason: 'no_valid_fragments', policy }
    return { allowed: true, kind: 'partial', reason: 'explicit_partial_preserved', policy, validFragments: Object.freeze([...context.validFragments]) }
  }
  if (context.error === 'invalid_output') return { allowed: false, reason: 'invalid_output_must_not_be_synthesized', policy }
  return { allowed: false, reason: policy.disposition === 'no_fallback' ? 'feature_has_no_fallback' : 'error_must_fail_closed', policy }
}

export function isAiFallbackAllowed(context: AiFallbackContext): boolean {
  return evaluateAiFallback(context).allowed
}

export function createAiDegradedResult<T>(feature: AiFallbackFeature, decision: Extract<AiFallbackDecision, { allowed: true }>, value: T): AiDegradedResult<T> {
  if (decision.kind === 'partial') return Object.freeze({ status: 'partial', feature, value, reason: decision.reason })
  return Object.freeze({ status: 'stale', feature, value, validatedAtMs: decision.stale.validatedAtMs, reason: decision.reason })
}

export function validateAiStaleCandidate(stale: AiStaleCandidate, context: Pick<AiFallbackContext, 'ownerId' | 'domain' | 'nowMs'>): AiStaleValidation {
  if (!context.ownerId || stale.ownerId !== context.ownerId) return { valid: false, reason: 'stale_owner_mismatch' }
  if (!context.domain || stale.domain !== context.domain) return { valid: false, reason: 'stale_domain_mismatch' }
  if (!Number.isFinite(context.nowMs) || !Number.isFinite(stale.validatedAtMs) || !Number.isFinite(stale.expiresAtMs) || stale.validatedAtMs > stale.expiresAtMs || (context.nowMs as number) > stale.expiresAtMs) return { valid: false, reason: 'stale_expired' }
  return { valid: true }
}
