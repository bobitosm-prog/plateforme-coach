import { clearActiveWorkout } from '../workout-session-storage'
import type {
  DetailedWorkoutPersistenceInput, QuickWorkoutPersistenceInput, QuickWorkoutPersistenceResult, WorkoutLocalStoragePort, WorkoutPersistenceClock,
  WorkoutPersistenceHooks, WorkoutPersistenceIssue, WorkoutPersistencePort,
  WorkoutPersistenceResult, PersistenceWriteResult,
} from './types'

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const
const dateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function attempt<T>(operation: () => Promise<PersistenceWriteResult<T>>): Promise<PersistenceWriteResult<T>> {
  try { return await operation() } catch { return { ok: false } }
}

function classify(issues: WorkoutPersistenceIssue[]): Exclude<WorkoutPersistenceResult, { ok: true } | { status: 'before_persistence_failure' }>['status'] {
  if (issues.length !== 1) return 'partial_reconciliation_required'
  if (issues[0] === 'session_create_failed') return 'session_create_failed'
  if (issues[0] === 'sets_create_failed') return 'sets_failed'
  if (issues[0] === 'completion_marker_failed') return 'completion_marker_failed'
  if (issues[0] === 'schedule_update_failed') return 'schedule_failed'
  if (issues[0] === 'profile_sync_failed') return 'after_session_failure'
  return 'partial_reconciliation_required'
}

export async function persistDetailedWorkout(
  input: DetailedWorkoutPersistenceInput,
  dependencies: {
    local: WorkoutLocalStoragePort
    persistence: WorkoutPersistencePort
    clock: WorkoutPersistenceClock
    hooks?: WorkoutPersistenceHooks
  },
): Promise<WorkoutPersistenceResult> {
  if (!input.userId) return { ok: false, status: 'before_persistence_failure', reason: 'missing_authenticated_user' }

  try { dependencies.local.clearActiveWorkout() } catch { /* legacy cleanup is best effort before writes */ }
  const issues: WorkoutPersistenceIssue[] = []
  const muscles = [...new Set(input.exercises.map(exercise => exercise.muscle).filter((value): value is string => !!value))]
  const session = await attempt(() => dependencies.persistence.createSession({
    user_id: input.userId,
    name: input.workoutName,
    completed: true,
    duration_minutes: Math.round(input.durationMs / 60_000),
    notes: `${input.completedSets}/${input.totalSets} sets · ${Math.round(input.totalVolume)} kg volume`,
    muscles_worked: muscles.length > 0 ? muscles : null,
  }))
  const sessionId = session.ok ? session.value.id : null
  if (!session.ok) issues.push('session_create_failed')

  if (sessionId) {
    const firstCompletedAt = dependencies.clock.now().toISOString()
    const firstSchedule = await attempt(() => dependencies.persistence.markScheduleCompleted({
      userId: input.userId, scheduledDate: dateKey(dependencies.clock.now()), completedAt: firstCompletedAt,
    }))
    if (!firstSchedule.ok) issues.push('schedule_update_failed')
    try { await dependencies.hooks?.afterSessionCreated?.(sessionId) } catch { /* ancillary legacy effects are non-blocking */ }

    const sets = input.exercises.flatMap(exercise => (exercise.sets ?? []).map((set, index) => ({
      session_id: sessionId,
      user_id: input.userId,
      exercise_name: exercise.name,
      exercise_id: exercise.exerciseId ?? null,
      set_number: index + 1,
      reps: Number(set.reps) || 0,
      weight: Number(set.weight) || 0,
      completed: true as const,
      rir: set.rir ?? null,
    })))
    if (sets.length > 0) {
      const setsResult = await attempt(() => dependencies.persistence.createSets(sets))
      if (!setsResult.ok) issues.push('sets_create_failed')
    }
    try { await dependencies.hooks?.afterSetsAttempted?.(sessionId) } catch { /* ancillary legacy effects are non-blocking */ }
  }

  const secondCompletedAt = dependencies.clock.now().toISOString()
  const secondSchedule = await attempt(() => dependencies.persistence.markScheduleCompleted({
    userId: input.userId, scheduledDate: dateKey(dependencies.clock.now()), completedAt: secondCompletedAt,
  }))
  if (!secondSchedule.ok && !issues.includes('schedule_update_failed')) issues.push('schedule_update_failed')

  const profileSync = await attempt(() => dependencies.persistence.updateLastWorkout({ userId: input.userId, completedAt: dependencies.clock.now().toISOString() }))
  if (!profileSync.ok) issues.push('profile_sync_failed')

  const programId = input.assignment.clientProgramId
  if (profileSync.ok && programId && input.weekdayKey) {
    const index = WEEKDAYS.indexOf(input.weekdayKey as typeof WEEKDAYS[number])
    const marker = await attempt(() => dependencies.persistence.createCompletionMarker({
      client_id: input.userId,
      coach_id: input.assignment.coachOfProgramId,
      program_id: programId,
      session_index: index >= 0 ? index : 0,
      session_name: input.workoutName ?? '',
      duration_minutes: input.durationMs ? Math.round(input.durationMs / 60_000) : null,
    }))
    if (!marker.ok) issues.push('completion_marker_failed')
  }

  if (issues.length === 0 && sessionId) return { ok: true, status: 'complete', sessionId, cacheCleanupAttemptedBeforePersistence: true }
  return {
    ok: false,
    status: classify(issues),
    sessionId,
    issues,
    cacheCleanupAttemptedBeforePersistence: true,
    requiresReconciliation: true,
  }
}

export function createWorkoutLocalStoragePort(storage: WorkoutLocalStoragePort['storage']): WorkoutLocalStoragePort {
  return { storage, clearActiveWorkout: () => clearActiveWorkout(storage) }
}

export async function persistQuickWorkout(
  input: QuickWorkoutPersistenceInput,
  persistence: Pick<WorkoutPersistencePort, 'createSession'>,
): Promise<QuickWorkoutPersistenceResult> {
  if (!input.userId) return { ok: false, status: 'before_persistence_failure', reason: 'missing_authenticated_user' }
  const session = await attempt(() => persistence.createSession({
    user_id: input.userId,
    name: input.workoutName,
    completed: true,
    duration_minutes: Math.max(input.durationMinutes, 1),
    notes: `${input.completedSets}/${input.totalSets} séries · ${input.exerciseCount} exercices`,
    muscles_worked: null,
  }))
  return session.ok
    ? { ok: true, status: 'complete', sessionId: session.value.id }
    : { ok: false, status: 'session_create_failed', requiresReconciliation: false }
}
