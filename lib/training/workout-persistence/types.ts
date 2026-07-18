import type { WorkoutStorage } from '../workout-session-storage'

export interface PersistedWorkoutSetInput {
  reps?: number | string
  weight?: number | string
  rir?: number | null
}

export interface PersistedWorkoutExerciseInput {
  name: string
  muscle?: string
  exerciseId?: string | null
  sets?: PersistedWorkoutSetInput[]
  setsTarget?: number
}

export interface DetailedWorkoutPersistenceInput {
  userId: string
  workoutName?: string
  weekdayKey?: string
  exercises: PersistedWorkoutExerciseInput[]
  durationMs: number
  completedSets: number
  totalSets: number
  totalVolume: number
  assignment: { clientProgramId: string | null; coachOfProgramId: string | null }
}

export interface QuickWorkoutPersistenceInput {
  userId: string
  workoutName: string
  durationMinutes: number
  completedSets: number
  totalSets: number
  exerciseCount: number
}

export interface WorkoutPersistenceClock { now(): Date }
export interface WorkoutLocalStoragePort { storage: WorkoutStorage; clearActiveWorkout(): void }

export type PersistenceWriteResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false }

export interface WorkoutPersistencePort {
  createSession(payload: {
    user_id: string; name?: string; completed: true; duration_minutes: number
    notes: string; muscles_worked: string[] | null
  }): Promise<PersistenceWriteResult<{ id: string }>>
  markScheduleCompleted(payload: { userId: string; scheduledDate: string; completedAt: string }): Promise<PersistenceWriteResult>
  createSets(payload: Array<{
    session_id: string; user_id: string; exercise_name: string; exercise_id: string | null
    set_number: number; reps: number; weight: number; completed: true; rir: number | null
  }>): Promise<PersistenceWriteResult>
  updateLastWorkout(payload: { userId: string; completedAt: string }): Promise<PersistenceWriteResult>
  createCompletionMarker(payload: {
    client_id: string; coach_id: string | null; program_id: string; session_index: number
    session_name: string; duration_minutes: number | null
  }): Promise<PersistenceWriteResult>
}

export type WorkoutPersistenceIssue =
  | 'session_create_failed'
  | 'schedule_update_failed'
  | 'sets_create_failed'
  | 'profile_sync_failed'
  | 'completion_marker_failed'

export type WorkoutPersistenceResult =
  | { ok: false; status: 'before_persistence_failure'; reason: 'missing_authenticated_user' }
  | { ok: true; status: 'complete'; sessionId: string; cacheCleanupAttemptedBeforePersistence: true }
  | {
      ok: false
      status: 'session_create_failed' | 'after_session_failure' | 'sets_failed' | 'completion_marker_failed' | 'schedule_failed' | 'partial_reconciliation_required'
      sessionId: string | null
      issues: WorkoutPersistenceIssue[]
      cacheCleanupAttemptedBeforePersistence: true
      requiresReconciliation: true
    }

export type QuickWorkoutPersistenceResult =
  | { ok: false; status: 'before_persistence_failure'; reason: 'missing_authenticated_user' }
  | { ok: false; status: 'session_create_failed'; requiresReconciliation: false }
  | { ok: true; status: 'complete'; sessionId: string }

export interface WorkoutPersistenceHooks {
  afterSessionCreated?(sessionId: string): Promise<void>
  afterSetsAttempted?(sessionId: string): Promise<void>
}
