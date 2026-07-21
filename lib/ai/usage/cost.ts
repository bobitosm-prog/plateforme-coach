import { estimateAiCost } from '@/lib/ai/models'

import type { AiRecordedTokens, AiUsageClock, AiUsageCostStatus } from './types'

export function estimateRecordedAiCost(input: { model: string; tokens?: AiRecordedTokens; clock: AiUsageClock; maxPriceAgeMs: number }): { status: AiUsageCostStatus; estimatedCostMicros?: bigint } {
  if (!input.tokens || (input.tokens.inputTokens === undefined && input.tokens.outputTokens === undefined)) return { status: 'unavailable' }
  const estimate = estimateAiCost({
    model: input.model,
    usage: { input: input.tokens.inputTokens, output: input.tokens.outputTokens },
    clock: input.clock,
    maxPriceAgeMs: input.maxPriceAgeMs,
  })
  if (estimate.status === 'complete' || estimate.status === 'partial') return { status: estimate.status, estimatedCostMicros: estimate.amount.wholeMicros }
  return { status: estimate.status }
}
