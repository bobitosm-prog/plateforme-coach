import type { DatabaseClient } from '@/lib/supabase/types'

import { estimateRecordedAiCost } from './cost'
import { getAiQuotaPolicy } from './policies'
import { createAiUsageService } from './service'
import { createSupabaseAiUsageRepository } from './supabase-port'
import type { AiFeature, AiRecordedTokens, AiUsageCostStatus, AiUsageOutcome, AiUsagePrincipal } from './types'

const CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/
const MAX_PRICE_AGE_MS = 366 * 24 * 60 * 60 * 1_000

export type AiUsageStartResult =
  | { status: 'started'; tracker: AiUsageTracker; remaining: number | null }
  | { status: 'denied'; reason: 'hourly_exhausted' | 'monthly_exhausted'; retryAfterMs: number }
  | { status: 'unavailable' }
  | { status: 'conflict' }

export interface AiUsageTracker {
  readonly correlationId: string
  finalize(input: {
    outcome: AiUsageOutcome
    reasonCode: string
    providerModel?: string
    tokens?: AiRecordedTokens
    attemptCount?: number
    tokenCompleteness?: Extract<AiUsageCostStatus, 'complete' | 'partial' | 'unavailable'>
  }): Promise<void>
}

export function aiUsageCorrelationId(request: { headers: { get(name: string): string | null } }): string {
  const supplied = request.headers.get('x-correlation-id') ?? request.headers.get('x-request-id')
  return supplied && CORRELATION_ID.test(supplied) ? supplied : crypto.randomUUID()
}

export async function startAiUsage(input: {
  client: DatabaseClient
  feature: AiFeature
  principal: AiUsagePrincipal
  correlationId: string
  logicalModel: string
  clock?: { now(): number }
}): Promise<AiUsageStartResult> {
  const clock = input.clock ?? { now: () => Date.now() }
  const service = createAiUsageService({ repository: createSupabaseAiUsageRepository(input.client), clock })
  const startedAt = clock.now()
  const result = await service.reserveAiUsage({
    feature: input.feature,
    principal: input.principal,
    correlationId: input.correlationId,
    logicalModel: input.logicalModel,
  })
  if (result.status === 'denied') return result
  if (result.status === 'conflict') return { status: 'conflict' }
  if (result.status !== 'allowed') {
    if (getAiQuotaPolicy(input.feature).tracking !== 'quota') {
      return { status: 'started', remaining: null, tracker: { correlationId: input.correlationId, async finalize() {} } }
    }
    return { status: 'unavailable' }
  }

  let finalized = false
  return {
    status: 'started',
    remaining: result.remaining,
    tracker: {
      correlationId: input.correlationId,
      async finalize(finalization) {
        if (finalized) return
        finalized = true
        const estimatedCost = estimateRecordedAiCost({
          model: finalization.providerModel ?? input.logicalModel,
          tokens: finalization.tokens,
          clock,
          maxPriceAgeMs: MAX_PRICE_AGE_MS,
        })
        const cost = finalization.tokenCompleteness === 'unavailable'
          ? { status: 'unavailable' as const }
          : finalization.tokenCompleteness === 'partial' && estimatedCost.status === 'complete'
            ? { ...estimatedCost, status: 'partial' as const }
            : estimatedCost
        await service.finalizeAiUsage({
          reservationId: result.reservation.id,
          correlationId: input.correlationId,
          feature: input.feature,
          policyId: result.reservation.policyId,
          principal: input.principal,
          outcome: finalization.outcome,
          reasonCode: finalization.reasonCode,
          requestedModel: input.logicalModel,
          providerModel: finalization.providerModel,
          tokens: finalization.tokens,
          estimatedCostMicros: cost.estimatedCostMicros,
          costStatus: cost.status,
          durationMs: Math.max(0, Math.min(300_000, clock.now() - startedAt)),
          attemptCount: finalization.attemptCount ?? 1,
        })
      },
    },
  }
}
