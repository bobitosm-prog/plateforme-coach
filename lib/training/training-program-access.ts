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

export interface TrainingProgramAccess {
  canView: boolean
  canConfigure: boolean
  canGenerateLater: boolean
  reason: TrainingProgramAccessReason
}

interface ResolveTrainingProgramAccessInput {
  capabilities: Pick<UserCapabilities, 'training' | 'ai'>
  activeProgramContext: ActiveTrainingProgramContext
}

/**
 * Resolves product access without re-resolving program ownership.
 * An active coach program is protected only when the authority context proves it.
 */
export function resolveTrainingProgramAccess({
  capabilities,
  activeProgramContext,
}: ResolveTrainingProgramAccessInput): TrainingProgramAccess {
  const relationStatus = activeProgramContext.coachRelation.status

  if (activeProgramContext.state === 'loading') {
    return { canView: true, canConfigure: false, canGenerateLater: false, reason: 'loading' }
  }

  if (relationStatus === 'multiple_active' || relationStatus === 'error') {
    return { canView: true, canConfigure: false, canGenerateLater: false, reason: 'relation_uncertain' }
  }

  if (activeProgramContext.state === 'error') {
    return { canView: true, canConfigure: false, canGenerateLater: false, reason: 'authority_error' }
  }

  const hasActiveCoachPlan = relationStatus === 'active' && activeProgramContext.source === 'coach'
  if (hasActiveCoachPlan) {
    return { canView: true, canConfigure: false, canGenerateLater: false, reason: 'coach_plan_protected' }
  }

  if (!capabilities.training) {
    return { canView: true, canConfigure: false, canGenerateLater: false, reason: 'training_unavailable' }
  }

  return {
    canView: true,
    canConfigure: true,
    canGenerateLater: capabilities.ai,
    reason: capabilities.ai ? null : 'ai_unavailable',
  }
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
