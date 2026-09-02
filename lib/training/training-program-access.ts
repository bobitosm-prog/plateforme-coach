import type { UserCapabilities } from '../entitlements/capabilities'
import type { ActiveTrainingProgramContext } from './active-program'

export type TrainingProgramAccessReason =
  | 'loading'
  | 'authority_error'
  | 'relation_uncertain'
  | 'coach_plan_protected'
  | 'training_unavailable'
  | 'ai_unavailable'
  | null

export type TrainingProgramAuthority = 'solo' | 'personal' | 'coach_managed' | 'fail_safe'
export type TrainingProgramGenerationReason =
  | 'loading'
  | 'authority_error'
  | 'coach_relation_error'
  | 'multiple_active_coach_relations'
  | 'managed_by_active_coach'
  | 'training_unavailable'
  | 'ai_not_available'
  | 'quota_loading'
  | 'quota_error'
  | 'quota_exhausted'
  | null
export type TrainingProgramQuotaState = 'not_loaded' | 'loading' | 'available' | 'error' | 'exhausted'

export interface TrainingProgramAccess {
  canView: boolean
  canConfigure: boolean
  canGenerateLater: boolean
  reason: TrainingProgramAccessReason
  authority: TrainingProgramAuthority
  source: ActiveTrainingProgramContext['source']
  isCoachManaged: boolean
  canManagePersonalProgram: boolean
  canGenerateWithAI: boolean
  generationReason: TrainingProgramGenerationReason
}

interface ResolveTrainingProgramAccessInput {
  capabilities: UserCapabilities
  activeProgramContext: ActiveTrainingProgramContext
  quotaState?: TrainingProgramQuotaState
}

/**
 * Resolves product access without re-resolving program ownership.
 * An active coach program is protected only when the authority context proves it.
 */
export function resolveTrainingProgramAccess({
  capabilities,
  activeProgramContext,
  quotaState = 'not_loaded',
}: ResolveTrainingProgramAccessInput): TrainingProgramAccess {
  const relationStatus = activeProgramContext.coachRelation.status
  const source = activeProgramContext.source

  function result({
    authority,
    canManage,
    managementReason,
    generationReason,
    isCoachManaged = false,
  }: {
    authority: TrainingProgramAuthority
    canManage: boolean
    managementReason: TrainingProgramAccessReason
    generationReason: TrainingProgramGenerationReason
    isCoachManaged?: boolean
  }): TrainingProgramAccess {
    const canGenerateLater = canManage && capabilities.ai
    return {
      canView: true,
      canConfigure: canManage,
      canGenerateLater,
      reason: managementReason,
      authority,
      source,
      isCoachManaged,
      canManagePersonalProgram: canManage,
      canGenerateWithAI: canGenerateLater && generationReason === null,
      generationReason,
    }
  }

  if (activeProgramContext.state === 'loading') {
    return result({ authority: 'fail_safe', canManage: false, managementReason: 'loading', generationReason: 'loading' })
  }

  if (relationStatus === 'multiple_active') {
    return result({ authority: 'fail_safe', canManage: false, managementReason: 'relation_uncertain', generationReason: 'multiple_active_coach_relations' })
  }

  if (relationStatus === 'error') {
    return result({ authority: 'fail_safe', canManage: false, managementReason: 'relation_uncertain', generationReason: 'coach_relation_error' })
  }

  if (activeProgramContext.state === 'error') {
    return result({ authority: 'fail_safe', canManage: false, managementReason: 'authority_error', generationReason: 'authority_error' })
  }

  const hasActiveCoachPlan = relationStatus === 'active' && activeProgramContext.source === 'coach'
  if (hasActiveCoachPlan) {
    return result({
      authority: 'coach_managed',
      canManage: false,
      managementReason: 'coach_plan_protected',
      generationReason: 'managed_by_active_coach',
      isCoachManaged: true,
    })
  }

  if (!capabilities.training) {
    return result({ authority: relationStatus === 'active' ? 'personal' : 'solo', canManage: false, managementReason: 'training_unavailable', generationReason: 'training_unavailable' })
  }

  const generationReason: TrainingProgramGenerationReason = !capabilities.ai
    ? 'ai_not_available'
    : quotaState === 'loading'
      ? 'quota_loading'
      : quotaState === 'error'
        ? 'quota_error'
        : quotaState === 'exhausted'
          ? 'quota_exhausted'
          : null

  return result({
    authority: relationStatus === 'active' ? 'personal' : 'solo',
    canManage: true,
    managementReason: capabilities.ai ? null : 'ai_unavailable',
    generationReason,
  })
}

function hasExercises(day: unknown): boolean {
  if (typeof day !== 'object' || day === null || Array.isArray(day)) return false
  const candidate = day as { is_rest?: unknown; repos?: unknown; exercises?: unknown }
  return candidate.is_rest !== true
    && candidate.repos !== true
    && Array.isArray(candidate.exercises)
    && candidate.exercises.length > 0
}

/** Counts non-rest, non-empty days from the already-authoritative program payload. */
export function resolveTrainingProgramFrequency(
  activeProgramContext: ActiveTrainingProgramContext,
): number | null {
  if (
    (activeProgramContext.state !== 'ready' && activeProgramContext.state !== 'partial')
    || typeof activeProgramContext.program !== 'object'
    || activeProgramContext.program === null
  ) return null

  let days: unknown[]
  if (activeProgramContext.source === 'personal') {
    const personalDays = (activeProgramContext.program as { days?: unknown }).days
    if (!Array.isArray(personalDays)) return null
    days = personalDays
  } else if (activeProgramContext.source === 'coach' && !Array.isArray(activeProgramContext.program)) {
    days = Object.values(activeProgramContext.program as Record<string, unknown>)
  } else {
    return null
  }

  const frequency = days.filter(hasExercises).length
  return frequency > 0 ? frequency : null
}

const OBJECTIVE_ALIASES: Readonly<Record<string, string>> = {
  cut: 'cut',
  seche: 'cut',
  'sèche': 'cut',
  perte_poids: 'cut',
  weight_loss: 'cut',
  maintain: 'maintain',
  maintenance: 'maintain',
  bulk: 'bulk',
  mass: 'bulk',
  prise_masse: 'bulk',
  strength: 'strength',
  force: 'strength',
  endurance: 'endurance',
  fitness: 'fitness',
  remise_forme: 'fitness',
}

export function resolveProfileTrainingObjective(value: unknown): { key: string | null; label: string | null } {
  if (typeof value !== 'string' || value.trim().length === 0) return { key: null, label: null }
  const label = value.trim()
  const normalized = label.toLocaleLowerCase().replace(/[\s-]+/g, '_')
  return { key: OBJECTIVE_ALIASES[normalized] ?? null, label }
}
