import { getAiQuotaPolicy } from './policies'
import type { AiFeature, AiUsageClock, AiUsageFinalization, AiUsageFinalizationResult, AiUsagePrincipal, AiUsageRepositoryPort, AiUsageReservationResult } from './types'

const SAFE_ID = /^[A-Za-z0-9._:-]+$/

export function createAiUsageService(input: { repository: AiUsageRepositoryPort; clock: AiUsageClock }) {
  return {
    async reserveAiUsage(request: { feature: AiFeature; principal: AiUsagePrincipal; correlationId: string; logicalModel?: string }): Promise<AiUsageReservationResult> {
      if (!validPrincipal(request.principal) || !validId(request.correlationId, 128) || (request.logicalModel !== undefined && !validText(request.logicalModel, 256))) return { status: 'failure', reason: 'invalid_input' }
      const policy = getAiQuotaPolicy(request.feature)
      const result = await input.repository.reserve({ principal: request.principal, policy, correlationId: request.correlationId, logicalModel: request.logicalModel, now: input.clock.now() })
      if (result.status === 'reserved') return { status: 'allowed', reservation: { id: result.reservationId, correlationId: request.correlationId, feature: request.feature, policyId: policy.id, principal: request.principal, reservedAt: input.clock.now() }, remaining: result.remaining }
      if (result.status === 'denied') return result
      if (result.status === 'conflict') return { status: 'conflict', reason: 'duplicate_correlation_id' }
      return { status: 'unavailable', reason: 'quota_store_unavailable' }
    },
    async finalizeAiUsage(finalization: AiUsageFinalization): Promise<AiUsageFinalizationResult> {
      if (!validId(finalization.reservationId, 256) || !validId(finalization.correlationId, 128)) return { status: 'failure', reason: 'invalid_input' }
      if (!validPrincipal(finalization.principal) || !validId(finalization.policyId, 128) || !validText(finalization.requestedModel, 256)) return { status: 'failure', reason: 'invalid_input' }
      const result = await input.repository.finalize(finalization)
      if (result.status === 'finalized') return { status: 'finalized' }
      if (result.status === 'already_finalized') return { status: 'conflict', reason: 'already_finalized' }
      if (result.status === 'not_found') return { status: 'failure', reason: 'reservation_not_found' }
      return { status: 'failure', reason: 'repository_failure' }
    },
  }
}

function validId(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max && SAFE_ID.test(value)
}

function validText(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max
}

function validPrincipal(principal: AiUsagePrincipal): boolean {
  return validId(principal.id, 128) && (principal.kind === 'user' || validId(principal.subjectUserId, 128))
}
