export type AiModelProvider = 'anthropic'
export type AiModelStatus = 'active' | 'legacy' | 'deprecated' | 'unavailable' | 'unknown'
export type AiCapabilityState = 'supported' | 'unsupported' | 'unknown'
export type AiPricingVerification = 'verified' | 'unknown'
export type AiCurrency = 'USD'
export type AiPricingUnit = 'per_million_tokens'

export type AiCostCategory =
  | 'input'
  | 'output'
  | 'cache_read'
  | 'cache_write_5m'
  | 'cache_write_1h'
  | 'batch_input'
  | 'batch_output'
  | 'tool'
  | 'image'

export interface AiModelCapabilities {
  text: AiCapabilityState
  image: AiCapabilityState
  tool: AiCapabilityState
  json: AiCapabilityState
  streaming: AiCapabilityState
}

export interface AiModelLimits {
  maxInputTokens: number | null
  maxOutputTokens: number | null
}

export interface AiTokenRate {
  microsPerMillionTokens: bigint
}

export interface AiModelPricing {
  currency: AiCurrency
  unit: AiPricingUnit
  effectiveFrom: string | null
  verifiedAt: string | null
  source: string | null
  verification: AiPricingVerification
  rates: Readonly<Record<AiCostCategory, AiTokenRate | null>>
}

export interface AiModelDefinition {
  logicalId: string
  providerModelId: string
  provider: AiModelProvider
  status: AiModelStatus
  capabilities: AiModelCapabilities
  limits: AiModelLimits
  pricing: AiModelPricing
  runtimeUsages: readonly string[]
  recommendedReplacement: string | null
}

export type AiModelRegistryResult =
  | { ok: true; models: readonly Readonly<AiModelDefinition>[] }
  | { ok: false; reason: 'duplicate_logical_id' | 'duplicate_provider_id' | 'invalid_entry' }

export type AiModelResolution =
  | { ok: true; model: Readonly<AiModelDefinition>; matchedBy: 'logical_id' | 'provider_id' }
  | { ok: false; reason: 'unknown_model' | 'invalid_identifier' }

export type AiUsageInput = Partial<Record<AiCostCategory, number | bigint>>
export type AiValidatedUsage = Readonly<Partial<Record<AiCostCategory, bigint>>>

export type AiUsageValidation =
  | { ok: true; usage: AiValidatedUsage }
  | { ok: false; reason: 'empty_usage' | 'invalid_tokens' }

export interface AiExactMoney {
  currency: AiCurrency
  wholeMicros: bigint
  subMicroNumerator: bigint
  subMicroDenominator: bigint
}

export interface AiCostComponent {
  category: AiCostCategory
  tokens: bigint
  rateMicrosPerMillionTokens: bigint
  exactMicrosNumerator: bigint
}

export type AiCostEstimateStatus = 'complete' | 'partial' | 'unavailable' | 'invalid'

export interface AiCostEstimateSuccess {
  status: 'complete' | 'partial'
  model: Readonly<AiModelDefinition>
  amount: AiExactMoney
  components: readonly AiCostComponent[]
  unavailableCategories: readonly AiCostCategory[]
  priceFreshness: 'verified'
}

export interface AiCostEstimateUnavailable {
  status: 'unavailable'
  reason: 'unknown_price' | 'stale_price'
  model: Readonly<AiModelDefinition>
  unavailableCategories: readonly AiCostCategory[]
}

export interface AiCostEstimateInvalid {
  status: 'invalid'
  reason: 'unknown_model' | 'invalid_usage' | 'currency_mismatch' | 'unit_mismatch' | 'invalid_clock'
}

export type AiCostEstimate = AiCostEstimateSuccess | AiCostEstimateUnavailable | AiCostEstimateInvalid
