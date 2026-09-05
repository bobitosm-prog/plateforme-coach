import type { ActiveCoachResolutionState } from '../coach-relations/repository'
import type { UserCapabilities } from '../entitlements/capabilities'

export type TrainingProgramState = 'loading' | 'ready' | 'empty' | 'partial' | 'error'
export type TrainingReadState = 'loading' | 'ready' | 'empty' | 'error'
export type TrainingProgramSource = 'personal' | 'coach' | 'none'
export type TrainingReplacementScope = 'session' | 'program' | 'none'
export type TrainingCoachRelationStatus = ActiveCoachResolutionState['status'] | 'ended'

export interface TrainingCoachRelationState {
  status: TrainingCoachRelationStatus
  coachId: string | null
  isAuthoritative?: boolean
  requiresReconciliation?: boolean
}

export interface PersonalTrainingProgram {
  id: string
  user_id?: string
  name?: string
  days: unknown[]
  is_active: boolean
  [key: string]: unknown
}

export interface CoachTrainingProgramRow {
  id: string
  coach_id: string | null
  program: unknown
  created_at?: string | null
  updated_at?: string | null
}

export interface ActiveTrainingProgramContext {
  state: TrainingProgramState
  source: TrainingProgramSource
  programId: string | null
  program: unknown | null
  coachRelation: TrainingCoachRelationState
  editable: boolean
  replacementScope: TrainingReplacementScope
  errors: string[]
}

export interface ResolveActiveTrainingProgramInput {
  loading?: boolean
  coachRelation: TrainingCoachRelationState
  coachPrograms: readonly CoachTrainingProgramRow[]
  personalProgram: PersonalTrainingProgram | null
  capabilities: Pick<UserCapabilities, 'training'>
  coachProgramReadError?: boolean
  personalProgramReadError?: boolean
  coachProgramValidator?: (program: unknown) => boolean
}

function isProgramPayload(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPersonalProgram(value: PersonalTrainingProgram | null): value is PersonalTrainingProgram {
  return Boolean(value?.id && value.is_active && Array.isArray(value.days))
}

export function emptyActiveTrainingProgram(
  coachRelation: TrainingCoachRelationState = { status: 'not_found', coachId: null },
): ActiveTrainingProgramContext {
  return {
    state: 'empty',
    source: 'none',
    programId: null,
    program: null,
    coachRelation,
    editable: false,
    replacementScope: 'none',
    errors: [],
  }
}

/**
 * Product capabilities and coach relations answer different questions.
 * Only an exact active coach relation can authorize a coach program.
 */
export function resolveActiveTrainingProgram({
  loading = false,
  coachRelation,
  coachPrograms,
  personalProgram,
  capabilities,
  coachProgramReadError = false,
  personalProgramReadError = false,
  coachProgramValidator = isProgramPayload,
}: ResolveActiveTrainingProgramInput): ActiveTrainingProgramContext {
  if (loading) return { ...emptyActiveTrainingProgram(coachRelation), state: 'loading' }

  const errors: string[] = []
  if (coachProgramReadError) errors.push('TRAINING_COACH_PROGRAM_READ_FAILED')
  if (personalProgramReadError) errors.push('TRAINING_PERSONAL_PROGRAM_READ_FAILED')

  if (coachRelation.status === 'error' || coachRelation.status === 'multiple_active') {
    return {
      ...emptyActiveTrainingProgram(coachRelation),
      state: 'error',
      errors: [
        coachRelation.status === 'error'
          ? 'TRAINING_COACH_RELATION_READ_FAILED'
          : 'TRAINING_MULTIPLE_ACTIVE_COACH_RELATIONS',
        ...errors,
      ],
    }
  }

  if (coachRelation.status === 'active' && coachRelation.isAuthoritative === true && coachRelation.coachId) {
    if (coachProgramReadError) {
      return { ...emptyActiveTrainingProgram(coachRelation), state: 'error', errors }
    }

    const coachProgram = coachPrograms.find(row => (
      row.coach_id === coachRelation.coachId && coachProgramValidator(row.program)
    ))
    if (coachProgram) {
      return {
        state: errors.length > 0 ? 'partial' : 'ready',
        source: 'coach',
        programId: coachProgram.id,
        program: coachProgram.program,
        coachRelation,
        editable: false,
        replacementScope: 'session',
        errors,
      }
    }
  }

  if (isPersonalProgram(personalProgram)) {
    return {
      state: errors.length > 0 ? 'partial' : 'ready',
      source: 'personal',
      programId: personalProgram.id,
      program: personalProgram,
      coachRelation,
      editable: capabilities.training,
      replacementScope: 'session',
      errors,
    }
  }

  if (personalProgramReadError) {
    return { ...emptyActiveTrainingProgram(coachRelation), state: 'error', errors }
  }

  return { ...emptyActiveTrainingProgram(coachRelation), errors }
}
