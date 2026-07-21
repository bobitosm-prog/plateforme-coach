import type { Json } from '@/lib/supabase/database.types'
import type { DatabaseClient } from '@/lib/supabase/types'

import type { AiUsageFinalization, AiUsageRepositoryPort } from './types'

type RpcObject = Record<string, Json | undefined>

export function createSupabaseAiUsageRepository(client: DatabaseClient): AiUsageRepositoryPort {
  return {
    async inspect() {
      return { ok: false }
    },

    async reserve(input) {
      const params = {
        p_feature: input.policy.feature,
        p_correlation_id: input.correlationId,
        p_logical_model: input.logicalModel,
      }
      const response = input.principal.kind === 'user'
        ? await client.rpc('reserve_ai_usage', params)
        : await client.rpc('reserve_ai_usage_server', {
            ...params,
            p_user_id: input.principal.subjectUserId,
            p_principal_id: input.principal.id,
          })
      if (response.error || !isObject(response.data)) return { status: 'failure' }
      return mapReservation(response.data)
    },

    async finalize(input) {
      const common = finalizationParams(input)
      const response = input.principal.kind === 'user'
        ? await client.rpc('finalize_ai_usage', common)
        : await client.rpc('finalize_ai_usage_server', {
            ...common,
            p_user_id: input.principal.subjectUserId,
            p_principal_id: input.principal.id,
          })
      if (response.error || !isObject(response.data)) return { status: 'failure' }
      if (response.data.status === 'finalized') return { status: 'finalized' }
      if (response.data.status === 'conflict') return { status: 'already_finalized' }
      if (response.data.status === 'failure' && response.data.reason === 'not_found') return { status: 'not_found' }
      return { status: 'failure' }
    },
  }
}

function finalizationParams(input: AiUsageFinalization) {
  return {
    p_reservation_id: input.reservationId,
    p_correlation_id: input.correlationId,
    p_feature: input.feature,
    p_policy_id: input.policyId,
    p_status: outcomeStatus(input.outcome),
    p_reason_code: input.reasonCode,
    p_logical_model: input.requestedModel,
    p_provider_model: input.providerModel,
    p_input_tokens: input.tokens?.inputTokens,
    p_output_tokens: input.tokens?.outputTokens,
    p_duration_ms: input.durationMs,
    p_attempt_count: input.attemptCount,
    p_estimated_cost_micros: input.estimatedCostMicros === undefined ? undefined : Number(input.estimatedCostMicros),
    p_cost_status: input.costStatus ?? 'unavailable',
  } as const
}

function outcomeStatus(outcome: AiUsageFinalization['outcome']): 'success' | 'failed' | 'cancelled' {
  if (outcome === 'succeeded') return 'success'
  return outcome
}

function mapReservation(value: RpcObject): Awaited<ReturnType<AiUsageRepositoryPort['reserve']>> {
  if (value.status === 'allowed' && typeof value.reservationId === 'string') {
    return { status: 'reserved', reservationId: value.reservationId, remaining: typeof value.remaining === 'number' ? value.remaining : null }
  }
  if (value.status === 'denied' && (value.reason === 'hourly_exhausted' || value.reason === 'monthly_exhausted')) {
    return { status: 'denied', reason: value.reason, retryAfterMs: typeof value.retryAfterMs === 'number' ? value.retryAfterMs : 0 }
  }
  if (value.status === 'conflict') return { status: 'conflict' }
  return { status: 'failure' }
}

function isObject(value: Json): value is RpcObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
