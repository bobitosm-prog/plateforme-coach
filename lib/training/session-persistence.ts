import { updateActiveWorkoutDraft, type ActiveWorkoutDraft } from './active-workout-draft'

export interface CompletedWorkoutSet {
  weight: number | ''
  reps: number | ''
  rir: number | null
}

export interface CompletedWorkoutExercise {
  name: string
  muscle: string
  exerciseId?: string | null
  setsTarget: number
  sets: CompletedWorkoutSet[]
}

export interface CompletedWorkoutData {
  duration: number
  completedSets: number
  totalSets: number
  totalVolume: number
  exercises: CompletedWorkoutExercise[]
}

export interface CriticalWorkoutPersistencePort {
  createSession(data: CompletedWorkoutData): Promise<string>
  countSessionSets(sessionId: string): Promise<number>
  insertSessionSets(sessionId: string, data: CompletedWorkoutData): Promise<void>
  completeSession(sessionId: string): Promise<void>
}

export interface PersistCriticalWorkoutInput {
  draft: ActiveWorkoutDraft
  data: CompletedWorkoutData
  port: CriticalWorkoutPersistencePort
  persistDraft: (draft: ActiveWorkoutDraft) => void
  now?: () => Date
}

export class WorkoutCriticalSaveError extends Error {
  readonly code: 'WORKOUT_SESSION_SAVE_FAILED' | 'WORKOUT_SETS_SAVE_FAILED' | 'WORKOUT_PARTIAL_SETS_FOUND' | 'WORKOUT_SESSION_FINALIZE_FAILED'
  readonly draft: ActiveWorkoutDraft

  constructor(code: WorkoutCriticalSaveError['code'], draft: ActiveWorkoutDraft) {
    super('La séance n’a pas pu être sauvegardée. Réessaie sans fermer cet écran.')
    this.name = 'WorkoutCriticalSaveError'
    this.code = code
    this.draft = draft
  }
}

function expectedSetCount(data: CompletedWorkoutData): number {
  return data.exercises.reduce((count, exercise) => count + exercise.sets.length, 0)
}

function saveError(
  draft: ActiveWorkoutDraft,
  code: WorkoutCriticalSaveError['code'],
  persistDraft: (draft: ActiveWorkoutDraft) => void,
  now: () => Date,
): never {
  const failed = updateActiveWorkoutDraft(draft, { status: 'save_error', errorCode: code }, now())
  persistDraft(failed)
  throw new WorkoutCriticalSaveError(code, failed)
}

/**
 * Critical persistence is intentionally separate from XP, badges and analytics.
 * A known remote session id is reused on retry; existing sets are checked before
 * inserting so a lost response does not intentionally duplicate the batch.
 */
export async function persistCriticalWorkout({
  draft,
  data,
  port,
  persistDraft,
  now = () => new Date(),
}: PersistCriticalWorkoutInput): Promise<{ draft: ActiveWorkoutDraft; sessionId: string }> {
  let current = updateActiveWorkoutDraft(draft, { status: 'saving', errorCode: undefined }, now())
  persistDraft(current)

  let sessionId = current.remoteSessionId
  if (!sessionId) {
    try {
      sessionId = await port.createSession(data)
    } catch {
      return saveError(current, 'WORKOUT_SESSION_SAVE_FAILED', persistDraft, now)
    }
    current = updateActiveWorkoutDraft(current, { remoteSessionId: sessionId }, now())
    persistDraft(current)
  }

  const expected = expectedSetCount(data)
  try {
    const existing = await port.countSessionSets(sessionId)
    if (existing !== expected) {
      if (existing !== 0) return saveError(current, 'WORKOUT_PARTIAL_SETS_FOUND', persistDraft, now)
      if (expected > 0) await port.insertSessionSets(sessionId, data)
    }
  } catch (error) {
    if (error instanceof WorkoutCriticalSaveError) throw error
    return saveError(current, 'WORKOUT_SETS_SAVE_FAILED', persistDraft, now)
  }

  try {
    await port.completeSession(sessionId)
  } catch {
    return saveError(current, 'WORKOUT_SESSION_FINALIZE_FAILED', persistDraft, now)
  }

  current = updateActiveWorkoutDraft(current, { status: 'completed', errorCode: undefined }, now())
  persistDraft(current)
  return { draft: current, sessionId }
}
