import type { AiErrorCode } from '../provider'

export type AiFallbackFeature =
  | 'chat-ai' | 'generate-recipe' | 'generate-meal-plan' | 'analyze-meal-photo'
  | 'suggest-exercise' | 'adapt-workout' | 'generate-exercise-instructions'
  | 'generate-program' | 'generate-custom-program' | 'training-regen'
  | 'suggest-overload' | 'analyze-body' | 'analyze-progress-photo'
  | 'weekly-diagnostic' | 'weekly-diagnostic-cron'

export type AiFallbackKind =
  | 'model' | 'provider' | 'content' | 'public_error' | 'partial'
  | 'cache' | 'stale_validated' | 'presentation_default' | 'retry' | 'degraded_without_ai'

export type AiFallbackDisposition = 'preserve' | 'prohibit' | 'explicit_partial' | 'stale_allowed' | 'no_fallback'
export type AiFallbackReason =
  | 'feature_has_no_fallback' | 'partial_not_supported' | 'no_valid_fragments'
  | 'quota_must_not_be_bypassed' | 'cancelled_must_not_fallback'
  | 'invalid_output_must_not_be_synthesized' | 'error_must_fail_closed'
  | 'explicit_partial_preserved' | 'stale_not_allowed' | 'stale_owner_mismatch'
  | 'stale_domain_mismatch' | 'stale_expired' | 'stale_validated'

export interface AiFallbackPolicy {
  readonly feature: AiFallbackFeature
  readonly disposition: AiFallbackDisposition
  readonly allowedKinds: readonly AiFallbackKind[]
  readonly partialSignal: 'explicit' | 'legacy_hidden' | 'not_applicable'
  readonly persistence: 'none' | 'valid_fragments_only' | 'aggregate_only'
  readonly currentBehavior: string
  readonly productRisk: string
}

export interface AiStaleCandidate {
  readonly ownerId: string
  readonly domain: string
  readonly validatedAtMs: number
  readonly expiresAtMs: number
  readonly value: unknown
}

export interface AiFallbackContext {
  readonly feature: AiFallbackFeature
  readonly error: AiErrorCode
  readonly validFragments?: readonly unknown[]
  readonly ownerId?: string
  readonly domain?: string
  readonly stale?: AiStaleCandidate
  readonly nowMs?: number
}

export type AiStaleValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'stale_owner_mismatch' | 'stale_domain_mismatch' | 'stale_expired' }

export type AiFallbackDecision =
  | { readonly allowed: false; readonly reason: AiFallbackReason; readonly policy: AiFallbackPolicy }
  | { readonly allowed: true; readonly kind: 'partial'; readonly reason: 'explicit_partial_preserved'; readonly policy: AiFallbackPolicy; readonly validFragments: readonly unknown[] }
  | { readonly allowed: true; readonly kind: 'stale_validated'; readonly reason: 'stale_validated'; readonly policy: AiFallbackPolicy; readonly stale: AiStaleCandidate }

export type AiDegradedResult<T> =
  | { readonly status: 'partial'; readonly feature: AiFallbackFeature; readonly value: T; readonly reason: 'explicit_partial_preserved' }
  | { readonly status: 'stale'; readonly feature: AiFallbackFeature; readonly value: T; readonly validatedAtMs: number; readonly reason: 'stale_validated' }

export const AI_FALLBACK_ERROR_CODES: readonly AiErrorCode[] = Object.freeze([
  'provider_refused', 'quota_exceeded', 'timeout', 'network_error',
  'invalid_output', 'unexpected_error', 'cancelled',
])
