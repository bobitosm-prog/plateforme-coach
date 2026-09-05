import type { ActiveCoachResolutionState } from '../coach-relations/repository'
import type { UserCapabilities } from '../entitlements/capabilities'

export type NutritionPlanStatus = 'loading' | 'ready' | 'empty' | 'error'

export type NutritionGenerationBlockReason =
  | 'coach_plan'
  | 'relation_uncertain'
  | 'plan_read_error'
  | 'capability'
  | 'quota_loading'
  | 'quota_error'
  | 'quota_exhausted'
  | null

type NutritionProgramAccessInput = {
  capabilities: UserCapabilities
  coachRelationStatus: ActiveCoachResolutionState['status']
  coachPlanActive: boolean
  planStatus: NutritionPlanStatus
  quota: {
    loading: boolean
    error: string | null
    remaining: number
  }
}

export function resolveNutritionPlanStatus({
  loading,
  error,
  hasActivePlan,
}: {
  loading: boolean
  error: boolean
  hasActivePlan: boolean
}): NutritionPlanStatus {
  if (loading) return 'loading'
  if (error) return 'error'
  return hasActivePlan ? 'ready' : 'empty'
}

/**
 * Product capabilities and coach relationship state deliberately answer
 * different questions: capabilities open personal configuration, while an
 * ambiguous relation or active coach plan only protects generation.
 */
export function resolveNutritionProgramAccess({
  capabilities,
  coachRelationStatus,
  coachPlanActive,
  planStatus,
  quota,
}: NutritionProgramAccessInput) {
  const relationUncertain = coachRelationStatus === 'error'
    || coachRelationStatus === 'multiple_active'

  let generationBlockReason: NutritionGenerationBlockReason = null
  if (coachPlanActive) generationBlockReason = 'coach_plan'
  else if (relationUncertain) generationBlockReason = 'relation_uncertain'
  else if (planStatus === 'error') generationBlockReason = 'plan_read_error'
  else if (!capabilities.nutrition || !capabilities.ai) generationBlockReason = 'capability'
  else if (quota.loading) generationBlockReason = 'quota_loading'
  else if (quota.error) generationBlockReason = 'quota_error'
  else if (quota.remaining <= 0) generationBlockReason = 'quota_exhausted'

  return {
    canConfigure: capabilities.nutrition,
    canGenerate: generationBlockReason === null,
    generationBlockReason,
    relationUncertain,
  }
}
