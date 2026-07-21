import type { AiQuotaPolicy, AiUsageClock, AiUsageEvent, AiUsageFinalization, AiUsageOperation } from './types'
import { estimateRecordedAiCost } from './cost'

const SAFE = /^[A-Za-z0-9._:-]+$/
const bounded = (value: string, max: number, fallback: string) => value.length > 0 && value.length <= max && SAFE.test(value) ? value : fallback

export function createAiUsageEvent(input: { feature: AiUsageEvent['feature']; operation: AiUsageOperation; finalization: AiUsageFinalization; policy: AiQuotaPolicy; clock: AiUsageClock; maxPriceAgeMs: number }): AiUsageEvent {
  const tokens = normalizeTokens(input.finalization.tokens)
  const cost = estimateRecordedAiCost({ model: input.finalization.providerModel ?? input.finalization.requestedModel, tokens, clock: input.clock, maxPriceAgeMs: input.maxPriceAgeMs })
  return Object.freeze({
    timestamp: new Date(input.clock.now()).toISOString(), event: 'AI_USAGE', feature: input.feature,
    operation: input.operation, result: input.finalization.outcome,
    reasonCode: bounded(input.finalization.reasonCode, 64, 'invalid_reason'),
    correlationId: bounded(input.finalization.correlationId, 128, 'invalid-correlation-id'),
    logicalModel: bounded(input.finalization.requestedModel, 256, 'unknown-model'),
    ...(input.finalization.providerModel ? { providerModel: bounded(input.finalization.providerModel, 256, 'unknown-model') } : {}),
    ...tokens,
    ...(tokens && tokens.inputTokens !== undefined && tokens.outputTokens !== undefined ? { totalTokens: tokens.inputTokens + tokens.outputTokens } : {}),
    costStatus: cost.status,
    ...(cost.estimatedCostMicros === undefined ? {} : { estimatedCostMicros: cost.estimatedCostMicros }),
    durationMs: clampInteger(input.finalization.durationMs, 0, 300_000),
    attemptCount: clampInteger(input.finalization.attemptCount, 1, 10),
    quotaPolicyId: bounded(input.policy.id, 128, 'unknown-policy'),
  })
}

function normalizeTokens(tokens: AiUsageFinalization['tokens']) {
  if (!tokens) return undefined
  const output: { inputTokens?: number; outputTokens?: number } = {}
  if (Number.isSafeInteger(tokens.inputTokens) && (tokens.inputTokens ?? -1) >= 0) output.inputTokens = tokens.inputTokens
  if (Number.isSafeInteger(tokens.outputTokens) && (tokens.outputTokens ?? -1) >= 0) output.outputTokens = tokens.outputTokens
  return Object.keys(output).length ? output : undefined
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
