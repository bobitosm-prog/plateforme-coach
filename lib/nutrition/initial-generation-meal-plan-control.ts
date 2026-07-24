import type {
  ActivePersonalMealPlanReadResult,
} from '@/lib/nutrition/personal-meal-plan-reader'

export type InitialGenerationMealPlanEvidence =
  | 'canonical'
  | 'legacy_converted'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'legacy_unsupported'
  | 'failure'

export interface InitialGenerationMealPlanControl {
  readonly status: 'idle' | 'resolved' | 'error'
  readonly hasActivePlan: boolean
  readonly evidence: InitialGenerationMealPlanEvidence | null
}

export function createInitialGenerationMealPlanControl(): InitialGenerationMealPlanControl {
  return {
    status: 'idle',
    hasActivePlan: false,
    evidence: null,
  }
}

export function settleInitialGenerationMealPlanControl(
  previous: InitialGenerationMealPlanControl,
  read: ActivePersonalMealPlanReadResult,
  isCurrentRequest: boolean,
): InitialGenerationMealPlanControl {
  if (!isCurrentRequest) return previous
  if (read.status === 'failure') {
    return {
      status: 'error',
      hasActivePlan: previous.hasActivePlan,
      evidence: 'failure',
    }
  }
  if (read.status === 'absent') {
    return {
      status: 'resolved',
      hasActivePlan: false,
      evidence: 'not_found',
    }
  }
  if (read.status === 'ready') {
    return {
      status: 'resolved',
      hasActivePlan: true,
      evidence: read.source,
    }
  }
  return {
    status: 'resolved',
    hasActivePlan: true,
    evidence: read.status,
  }
}
