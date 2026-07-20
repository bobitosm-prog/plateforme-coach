import { describe, expect, it } from 'vitest'
import {
  AI_MODEL_REGISTRY,
  createAiModelRegistry,
  estimateAiCost,
  getAiModel,
  getAiModelCapability,
  listAiModels,
  resolveAiModel,
  validateAiUsage,
  validatePriceFreshness,
} from '../../lib/ai/models'

const VERIFIED_AT = Date.parse('2026-07-20T12:00:00.000Z')
const clock = { now: () => VERIFIED_AT }
const maxPriceAgeMs = 7 * 24 * 60 * 60 * 1_000

describe('AI model registry', () => {
  it('represents the three runtime models and the offline legacy model', () => {
    expect(listAiModels().map(model => [model.logicalId, model.providerModelId, model.status])).toEqual([
      ['anthropic-haiku-4.5', 'claude-haiku-4-5-20251001', 'active'],
      ['anthropic-sonnet-4.6', 'claude-sonnet-4-6', 'active'],
      ['anthropic-opus-4.8', 'claude-opus-4-8', 'active'],
      ['anthropic-opus-4.7-legacy', 'claude-opus-4-7', 'legacy'],
    ])
  })

  it('resolves logical and provider identifiers without fallback', () => {
    expect(resolveAiModel('anthropic-sonnet-4.6')).toMatchObject({ ok: true, matchedBy: 'logical_id', model: { providerModelId: 'claude-sonnet-4-6' } })
    expect(resolveAiModel('claude-sonnet-4-6')).toMatchObject({ ok: true, matchedBy: 'provider_id', model: { logicalId: 'anthropic-sonnet-4.6' } })
    expect(resolveAiModel('claude-nearby-model')).toEqual({ ok: false, reason: 'unknown_model' })
    expect(resolveAiModel('private model content')).toEqual({ ok: false, reason: 'invalid_identifier' })
    expect(getAiModel('missing')).toBeNull()
  })

  it('keeps every registry level immutable', () => {
    const registry = listAiModels()
    expect(Object.isFrozen(registry)).toBe(true)
    expect(Object.isFrozen(registry[0])).toBe(true)
    expect(Object.isFrozen(registry[0].pricing.rates)).toBe(true)
    expect(Object.isFrozen(registry[0].runtimeUsages)).toBe(true)
  })

  it('refuses duplicate logical and provider identifiers', () => {
    const model = AI_MODEL_REGISTRY[0]
    expect(createAiModelRegistry([model, { ...model, providerModelId: 'other-provider-id' }])).toEqual({ ok: false, reason: 'duplicate_logical_id' })
    expect(createAiModelRegistry([model, { ...model, logicalId: 'other-logical-id' }])).toEqual({ ok: false, reason: 'duplicate_provider_id' })
  })

  it('reports supported and unknown capabilities without inference', () => {
    expect(getAiModelCapability('anthropic-opus-4.8', 'text')).toBe('supported')
    expect(getAiModelCapability('anthropic-opus-4.8', 'image')).toBe('supported')
    expect(getAiModelCapability('anthropic-opus-4.8', 'tool')).toBe('supported')
    expect(getAiModelCapability('anthropic-opus-4.8', 'streaming')).toBe('unknown')
    expect(getAiModelCapability('missing', 'text')).toBeNull()
  })
})
describe('AI usage and cost estimation', () => {
  it('validates zero and rejects negative, fractional, unsafe and non-finite token counts', () => {
    expect(validateAiUsage({ input: 0 })).toEqual({ ok: true, usage: { input: BigInt(0) } })
    expect(validateAiUsage({})).toEqual({ ok: false, reason: 'empty_usage' })
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(validateAiUsage({ input: value })).toEqual({ ok: false, reason: 'invalid_tokens' })
    }
    expect(validateAiUsage({ input: BigInt(-1) })).toEqual({ ok: false, reason: 'invalid_tokens' })
  })

  it('estimates input-only, output-only and combined standard costs exactly', () => {
    const input = estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1_000_000 }, clock, maxPriceAgeMs })
    expect(input).toMatchObject({ status: 'complete', amount: { currency: 'USD', wholeMicros: BigInt(1_000_000), subMicroNumerator: BigInt(0) } })
    const output = estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { output: 2_000_000 }, clock, maxPriceAgeMs })
    expect(output).toMatchObject({ status: 'complete', amount: { wholeMicros: BigInt(10_000_000) } })
    const total = estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1_000_000, output: 2_000_000 }, clock, maxPriceAgeMs })
    expect(total).toMatchObject({ status: 'complete', amount: { wholeMicros: BigInt(11_000_000) } })
  })

  it('preserves sub-micro precision and very large volumes with bigint arithmetic', () => {
    const fraction = estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { cache_read: 1 }, clock, maxPriceAgeMs })
    expect(fraction).toMatchObject({ status: 'complete', amount: { wholeMicros: BigInt(0), subMicroNumerator: BigInt(100_000), subMicroDenominator: BigInt(1_000_000) } })
    const huge = BigInt('1000000000000000000000000000000')
    const estimate = estimateAiCost({ model: 'anthropic-opus-4.8', usage: { input: huge }, clock, maxPriceAgeMs })
    expect(estimate).toMatchObject({ status: 'complete', amount: { wholeMicros: huge * BigInt(5) } })
  })

  it('marks mixed known and unknown categories partial and unknown-only usage unavailable', () => {
    expect(estimateAiCost({ model: 'anthropic-opus-4.8', usage: { input: 100, image: 1 }, clock, maxPriceAgeMs })).toMatchObject({ status: 'partial', unavailableCategories: ['image'] })
    expect(estimateAiCost({ model: 'anthropic-opus-4.8', usage: { tool: 1 }, clock, maxPriceAgeMs })).toMatchObject({ status: 'unavailable', reason: 'unknown_price', unavailableCategories: ['tool'] })
  })

  it('refuses stale prices, unknown models, invalid clocks, currencies and units', () => {
    expect(validatePriceFreshness('2026-07-20T00:00:00.000Z', 'verified', Date.parse('2026-08-20T00:00:00.000Z'), maxPriceAgeMs)).toBe('stale')
    expect(validatePriceFreshness(null, 'unknown', VERIFIED_AT, maxPriceAgeMs)).toBe('unknown')
    expect(estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1 }, clock: { now: () => Date.parse('2026-08-20T00:00:00.000Z') }, maxPriceAgeMs })).toMatchObject({ status: 'unavailable', reason: 'stale_price' })
    expect(estimateAiCost({ model: 'missing', usage: { input: 1 }, clock, maxPriceAgeMs })).toEqual({ status: 'invalid', reason: 'unknown_model' })
    expect(estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1 }, clock: { now: () => Number.NaN }, maxPriceAgeMs })).toEqual({ status: 'invalid', reason: 'invalid_clock' })
    expect(estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1 }, clock, maxPriceAgeMs, currency: 'EUR' })).toEqual({ status: 'invalid', reason: 'currency_mismatch' })
    expect(estimateAiCost({ model: 'anthropic-haiku-4.5', usage: { input: 1 }, clock, maxPriceAgeMs, unit: 'per_token' })).toEqual({ status: 'invalid', reason: 'unit_mismatch' })
  })

  it('is stable, deterministic and does not mutate usage', () => {
    const usage = Object.freeze({ input: 123, output: 45 })
    const first = estimateAiCost({ model: 'claude-sonnet-4-6', usage, clock, maxPriceAgeMs })
    const second = estimateAiCost({ model: 'claude-sonnet-4-6', usage, clock, maxPriceAgeMs })
    expect(first).toEqual(second)
    expect(usage).toEqual({ input: 123, output: 45 })
  })
})
