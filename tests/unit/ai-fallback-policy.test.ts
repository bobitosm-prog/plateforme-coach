import { describe, expect, it } from 'vitest'
import { AI_GOLDEN_CONTRACTS } from '../fixtures/ai-golden'
import {
  AI_FALLBACK_ERROR_CODES, AI_FALLBACK_POLICIES, createAiDegradedResult,
  evaluateAiFallback, getAiFallbackPolicy, isAiFallbackAllowed, validateAiStaleCandidate,
} from '../../lib/ai/fallbacks'

const partialFeatures = new Set(['generate-meal-plan', 'generate-exercise-instructions', 'training-regen', 'weekly-diagnostic-cron'])

describe('AI fallback policy registry', () => {
  it('contains exactly one immutable policy for each of the fifteen golden features', () => {
    expect(AI_FALLBACK_POLICIES).toHaveLength(15)
    expect(new Set(AI_FALLBACK_POLICIES.map(policy => policy.feature)).size).toBe(15)
    expect(AI_GOLDEN_CONTRACTS).toHaveLength(15)
    expect(AI_FALLBACK_POLICIES.every(policy => Object.isFrozen(policy) && Object.isFrozen(policy.allowedKinds))).toBe(true)
    const goldenToFeature = {
      'chat-athena': 'chat-ai', 'generate-recipe': 'generate-recipe', 'generate-meal-plan': 'generate-meal-plan',
      'analyze-meal-photo': 'analyze-meal-photo', 'suggest-exercise': 'suggest-exercise',
      'generate-exercise-instructions': 'generate-exercise-instructions', 'generate-program-legacy': 'generate-program',
      'generate-program-modern': 'generate-custom-program', 'training-regen-cron': 'training-regen',
      'adapt-workout': 'adapt-workout', 'suggest-overload': 'suggest-overload', 'analyze-body': 'analyze-body',
      'analyze-progress-photo': 'analyze-progress-photo', 'weekly-diagnostic-manual': 'weekly-diagnostic',
      'weekly-diagnostic-cron': 'weekly-diagnostic-cron',
    } as const
    expect(AI_GOLDEN_CONTRACTS.map(contract => goldenToFeature[contract.id]).sort())
      .toEqual(AI_FALLBACK_POLICIES.map(policy => policy.feature).sort())
  })

  it('never permits model, provider, retry, cache or invented content fallbacks', () => {
    for (const policy of AI_FALLBACK_POLICIES) {
      expect(policy.allowedKinds).not.toContain('model')
      expect(policy.allowedKinds).not.toContain('provider')
      expect(policy.allowedKinds).not.toContain('retry')
      expect(policy.allowedKinds).not.toContain('cache')
      expect(policy.allowedKinds).not.toContain('content')
      expect(policy.allowedKinds).not.toContain('presentation_default')
      expect(policy.allowedKinds).not.toContain('degraded_without_ai')
    }
  })

  it('marks only the four observed aggregate/fragment contracts as explicitly partial', () => {
    for (const policy of AI_FALLBACK_POLICIES) {
      expect(policy.disposition).toBe(partialFeatures.has(policy.feature) ? 'explicit_partial' : 'no_fallback')
    }
    expect(getAiFallbackPolicy('generate-meal-plan').partialSignal).toBe('legacy_hidden')
  })
})

describe('AI fallback error matrix', () => {
  it.each(AI_FALLBACK_POLICIES.flatMap(policy => AI_FALLBACK_ERROR_CODES.map(error => ({ policy, error }))))('$policy.feature × $error is explicit and fail-closed where required', ({ policy, error }) => {
    const decision = evaluateAiFallback({ feature: policy.feature, error, validFragments: [{ id: 'valid-fragment' }] })
    const partialAllowed = partialFeatures.has(policy.feature) && !['quota_exceeded', 'cancelled', 'unexpected_error'].includes(error)
    expect(decision.allowed).toBe(partialAllowed)
    if (!decision.allowed && error === 'quota_exceeded') expect(decision.reason).toBe('quota_must_not_be_bypassed')
    if (!decision.allowed && error === 'cancelled') expect(decision.reason).toBe('cancelled_must_not_fallback')
    if (!decision.allowed && error === 'invalid_output' && !partialFeatures.has(policy.feature)) expect(decision.reason).toBe('invalid_output_must_not_be_synthesized')
  })

  it.each(['generate-meal-plan', 'generate-exercise-instructions', 'training-regen', 'weekly-diagnostic-cron'] as const)('%s refuses partial when no valid fragment exists', feature => {
    expect(evaluateAiFallback({ feature, error: 'invalid_output', validFragments: [] })).toMatchObject({ allowed: false, reason: 'no_valid_fragments' })
  })

  it.each(['chat-ai', 'generate-recipe', 'suggest-exercise', 'adapt-workout', 'suggest-overload', 'analyze-body', 'analyze-progress-photo', 'weekly-diagnostic'] as const)('%s never invents content after invalid output', feature => {
    expect(isAiFallbackAllowed({ feature, error: 'invalid_output', validFragments: [{ value: 0 }] })).toBe(false)
  })

  it('creates a typed immutable partial result from validated fragments only', () => {
    const decision = evaluateAiFallback({ feature: 'generate-meal-plan', error: 'network_error', validFragments: [{ day: 'lundi' }] })
    expect(decision.allowed).toBe(true)
    if (!decision.allowed || decision.kind !== 'partial') throw new Error('Expected partial decision')
    const result = createAiDegradedResult('generate-meal-plan', decision, decision.validFragments)
    expect(result).toEqual({ status: 'partial', feature: 'generate-meal-plan', value: [{ day: 'lundi' }], reason: 'explicit_partial_preserved' })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('rejects stale data because no current feature has an owner-scoped stale contract', () => {
    const base = { feature: 'chat-ai' as const, error: 'network_error' as const, ownerId: 'owner-a', domain: 'chat', nowMs: 100, stale: { ownerId: 'owner-a', domain: 'chat', validatedAtMs: 50, expiresAtMs: 150, value: 'validated' } }
    expect(evaluateAiFallback(base)).toMatchObject({ allowed: false, reason: 'stale_not_allowed' })
    expect(evaluateAiFallback({ ...base, ownerId: 'owner-b' })).toMatchObject({ allowed: false, reason: 'stale_not_allowed' })
    expect(evaluateAiFallback({ ...base, nowMs: 200 })).toMatchObject({ allowed: false, reason: 'stale_not_allowed' })
  })

  it('validates future stale candidates fail-closed without authorizing them', () => {
    const stale = { ownerId: 'owner-a', domain: 'chat', validatedAtMs: 50, expiresAtMs: 150, value: 'validated' }
    expect(validateAiStaleCandidate(stale, { ownerId: 'owner-a', domain: 'chat', nowMs: 100 })).toEqual({ valid: true })
    expect(validateAiStaleCandidate(stale, { ownerId: 'owner-b', domain: 'chat', nowMs: 100 })).toEqual({ valid: false, reason: 'stale_owner_mismatch' })
    expect(validateAiStaleCandidate(stale, { ownerId: 'owner-a', domain: 'nutrition', nowMs: 100 })).toEqual({ valid: false, reason: 'stale_domain_mismatch' })
    expect(validateAiStaleCandidate(stale, { ownerId: 'owner-a', domain: 'chat', nowMs: 151 })).toEqual({ valid: false, reason: 'stale_expired' })
  })

  it('is deterministic and does not mutate fragments', () => {
    const fragments = Object.freeze([{ day: 'lundi' }])
    const input = { feature: 'generate-meal-plan' as const, error: 'timeout' as const, validFragments: fragments }
    expect(evaluateAiFallback(input)).toEqual(evaluateAiFallback(input))
    expect(fragments).toEqual([{ day: 'lundi' }])
  })
})
