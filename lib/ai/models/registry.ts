import type { AiCostCategory, AiModelDefinition, AiModelRegistryResult, AiTokenRate } from './types'

const OFFICIAL_PRICING = 'https://platform.claude.com/docs/en/about-claude/pricing'
const VERIFIED_AT = '2026-07-20T00:00:00.000Z'

const rate = (microsPerMillionTokens: number): AiTokenRate => ({
  microsPerMillionTokens: BigInt(microsPerMillionTokens),
})

function rates(values: Partial<Record<AiCostCategory, number>>): Readonly<Record<AiCostCategory, AiTokenRate | null>> {
  return {
    input: values.input === undefined ? null : rate(values.input),
    output: values.output === undefined ? null : rate(values.output),
    cache_read: values.cache_read === undefined ? null : rate(values.cache_read),
    cache_write_5m: values.cache_write_5m === undefined ? null : rate(values.cache_write_5m),
    cache_write_1h: values.cache_write_1h === undefined ? null : rate(values.cache_write_1h),
    batch_input: values.batch_input === undefined ? null : rate(values.batch_input),
    batch_output: values.batch_output === undefined ? null : rate(values.batch_output),
    tool: null,
    image: null,
  }
}

const commonCapabilities = {
  text: 'supported',
  image: 'supported',
  tool: 'supported',
  json: 'supported',
  streaming: 'unknown',
} as const

const definitions: AiModelDefinition[] = [
  {
    logicalId: 'anthropic-haiku-4.5',
    providerModelId: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    status: 'active',
    capabilities: commonCapabilities,
    limits: { maxInputTokens: 200_000, maxOutputTokens: 64_000 },
    pricing: {
      currency: 'USD', unit: 'per_million_tokens', effectiveFrom: null,
      verifiedAt: VERIFIED_AT, source: OFFICIAL_PRICING, verification: 'verified',
      rates: rates({ input: 1_000_000, output: 5_000_000, cache_read: 100_000, cache_write_5m: 1_250_000, cache_write_1h: 2_000_000, batch_input: 500_000, batch_output: 2_500_000 }),
    },
    runtimeUsages: ['generate-recipe', 'suggest-exercise', 'generate-exercise-instructions', 'generate-program', 'suggest-overload'],
    recommendedReplacement: null,
  },
  {
    logicalId: 'anthropic-sonnet-4.6',
    providerModelId: 'claude-sonnet-4-6',
    provider: 'anthropic',
    status: 'active',
    capabilities: commonCapabilities,
    limits: { maxInputTokens: 1_000_000, maxOutputTokens: 128_000 },
    pricing: {
      currency: 'USD', unit: 'per_million_tokens', effectiveFrom: null,
      verifiedAt: VERIFIED_AT, source: OFFICIAL_PRICING, verification: 'verified',
      rates: rates({ input: 3_000_000, output: 15_000_000, cache_read: 300_000, cache_write_5m: 3_750_000, cache_write_1h: 6_000_000, batch_input: 1_500_000, batch_output: 7_500_000 }),
    },
    runtimeUsages: ['chat-ai', 'adapt-workout', 'analyze-meal-photo'],
    recommendedReplacement: null,
  },
  {
    logicalId: 'anthropic-opus-4.8',
    providerModelId: 'claude-opus-4-8',
    provider: 'anthropic',
    status: 'active',
    capabilities: commonCapabilities,
    limits: { maxInputTokens: 1_000_000, maxOutputTokens: 128_000 },
    pricing: {
      currency: 'USD', unit: 'per_million_tokens', effectiveFrom: null,
      verifiedAt: VERIFIED_AT, source: OFFICIAL_PRICING, verification: 'verified',
      rates: rates({ input: 5_000_000, output: 25_000_000, cache_read: 500_000, cache_write_5m: 6_250_000, cache_write_1h: 10_000_000, batch_input: 2_500_000, batch_output: 12_500_000 }),
    },
    runtimeUsages: ['generate-custom-program', 'training-regen', 'generate-meal-plan', 'weekly-diagnostic', 'analyze-body', 'analyze-progress-photo'],
    recommendedReplacement: null,
  },
  {
    logicalId: 'anthropic-opus-4.7-legacy',
    providerModelId: 'claude-opus-4-7',
    provider: 'anthropic',
    status: 'legacy',
    capabilities: commonCapabilities,
    limits: { maxInputTokens: 1_000_000, maxOutputTokens: null },
    pricing: {
      currency: 'USD', unit: 'per_million_tokens', effectiveFrom: null,
      verifiedAt: VERIFIED_AT, source: OFFICIAL_PRICING, verification: 'verified',
      rates: rates({ input: 5_000_000, output: 25_000_000, cache_read: 500_000, cache_write_5m: 6_250_000, cache_write_1h: 10_000_000, batch_input: 2_500_000, batch_output: 12_500_000 }),
    },
    runtimeUsages: [],
    recommendedReplacement: null,
  },
]

export function createAiModelRegistry(entries: readonly AiModelDefinition[]): AiModelRegistryResult {
  const logicalIds = new Set<string>()
  const providerIds = new Set<string>()
  for (const entry of entries) {
    if (!entry.logicalId || !entry.providerModelId || !entry.provider || !entry.pricing) return { ok: false, reason: 'invalid_entry' }
    if (logicalIds.has(entry.logicalId)) return { ok: false, reason: 'duplicate_logical_id' }
    if (providerIds.has(entry.providerModelId)) return { ok: false, reason: 'duplicate_provider_id' }
    logicalIds.add(entry.logicalId)
    providerIds.add(entry.providerModelId)
  }
  return { ok: true, models: deepFreeze([...entries]) }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}

const created = createAiModelRegistry(definitions)
if (!created.ok) throw new Error('Invalid built-in AI model registry')

export const AI_MODEL_REGISTRY = created.models
