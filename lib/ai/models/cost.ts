import { resolveAiModel } from './resolution'
import type {
  AiCostCategory,
  AiCostComponent,
  AiCostEstimate,
  AiCurrency,
  AiPricingUnit,
  AiUsageInput,
  AiUsageValidation,
  AiValidatedUsage,
} from './types'

const TOKEN_UNIT = BigInt(1_000_000)
const CATEGORIES: readonly AiCostCategory[] = ['input', 'output', 'cache_read', 'cache_write_5m', 'cache_write_1h', 'batch_input', 'batch_output', 'tool', 'image']

export function validateAiUsage(input: AiUsageInput): AiUsageValidation {
  const usage: Partial<Record<AiCostCategory, bigint>> = {}
  let present = false
  for (const category of CATEGORIES) {
    const value = input[category]
    if (value === undefined) continue
    present = true
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return { ok: false, reason: 'invalid_tokens' }
    if (typeof value === 'bigint' && value < BigInt(0)) return { ok: false, reason: 'invalid_tokens' }
    usage[category] = typeof value === 'bigint' ? value : BigInt(value)
  }
  return present ? { ok: true, usage: Object.freeze(usage) } : { ok: false, reason: 'empty_usage' }
}

export function estimateAiCost(options: {
  model: string
  usage: AiUsageInput
  clock: { now(): number }
  maxPriceAgeMs: number
  currency?: string
  unit?: string
}): AiCostEstimate {
  const resolved = resolveAiModel(options.model)
  if (!resolved.ok) return { status: 'invalid', reason: 'unknown_model' }
  if (options.currency !== undefined && options.currency !== resolved.model.pricing.currency) return { status: 'invalid', reason: 'currency_mismatch' }
  if (options.unit !== undefined && options.unit !== resolved.model.pricing.unit) return { status: 'invalid', reason: 'unit_mismatch' }
  const validated = validateAiUsage(options.usage)
  if (!validated.ok) return { status: 'invalid', reason: 'invalid_usage' }
  const freshness = validatePriceFreshness(resolved.model.pricing.verifiedAt, resolved.model.pricing.verification, options.clock.now(), options.maxPriceAgeMs)
  if (freshness === 'invalid') return { status: 'invalid', reason: 'invalid_clock' }
  if (freshness === 'unknown' || freshness === 'stale') {
    return { status: 'unavailable', reason: freshness === 'stale' ? 'stale_price' : 'unknown_price', model: resolved.model, unavailableCategories: Object.keys(validated.usage) as AiCostCategory[] }
  }

  const components: AiCostComponent[] = []
  const unavailableCategories: AiCostCategory[] = []
  let exactMicrosNumerator = BigInt(0)
  for (const category of CATEGORIES) {
    const tokens = validated.usage[category]
    if (tokens === undefined) continue
    const rate = resolved.model.pricing.rates[category]
    if (!rate) {
      unavailableCategories.push(category)
      continue
    }
    const componentNumerator = tokens * rate.microsPerMillionTokens
    exactMicrosNumerator += componentNumerator
    components.push({ category, tokens, rateMicrosPerMillionTokens: rate.microsPerMillionTokens, exactMicrosNumerator: componentNumerator })
  }
  if (!components.length) return { status: 'unavailable', reason: 'unknown_price', model: resolved.model, unavailableCategories }
  const amount = exactMoney(resolved.model.pricing.currency, exactMicrosNumerator)
  return {
    status: unavailableCategories.length ? 'partial' : 'complete',
    model: resolved.model,
    amount,
    components: Object.freeze(components),
    unavailableCategories: Object.freeze(unavailableCategories),
    priceFreshness: 'verified',
  }
}

export function validatePriceFreshness(verifiedAt: string | null, verification: 'verified' | 'unknown', nowMs: number, maxAgeMs: number): 'verified' | 'unknown' | 'stale' | 'invalid' {
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) return 'invalid'
  if (verification !== 'verified' || !verifiedAt) return 'unknown'
  const timestamp = Date.parse(verifiedAt)
  if (!Number.isFinite(timestamp) || timestamp > nowMs) return 'invalid'
  return nowMs - timestamp <= maxAgeMs ? 'verified' : 'stale'
}

function exactMoney(currency: AiCurrency, numerator: bigint) {
  return {
    currency,
    wholeMicros: numerator / TOKEN_UNIT,
    subMicroNumerator: numerator % TOKEN_UNIT,
    subMicroDenominator: TOKEN_UNIT,
  }
}

export function isSupportedPricingUnit(value: string): value is AiPricingUnit {
  return value === 'per_million_tokens'
}

export function normalizeValidatedUsage(usage: AiValidatedUsage): AiValidatedUsage {
  return Object.freeze({ ...usage })
}
