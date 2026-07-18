import {
  clearWorkoutDraft, readWorkoutDraft, writeWorkoutDraft,
  type StoredWorkoutDraft, type WorkoutStorage,
} from './workout-session-storage'

export interface WorkoutDraftClock { now(): Date }
export type WorkoutDraftWriteResult = { ok: true } | { ok: false; reason: 'storage_unavailable' }

export function saveWorkoutDraftSnapshot<TExercise>(
  storage: WorkoutStorage,
  input: { sessionName: string; startedAt?: string; exos: TExercise[] },
  clock: WorkoutDraftClock,
): WorkoutDraftWriteResult {
  const draft: StoredWorkoutDraft<TExercise> = {
    sessionName: input.sessionName,
    startedAt: input.startedAt ?? clock.now().toISOString(),
    savedAt: clock.now().toISOString(),
    exos: input.exos,
  }
  try {
    writeWorkoutDraft(storage, draft)
    return { ok: true }
  } catch { return { ok: false, reason: 'storage_unavailable' } }
}

export function restoreWorkoutDraftSnapshot<TExercise>(
  storage: WorkoutStorage,
  sessionName: string,
  clock: WorkoutDraftClock,
): StoredWorkoutDraft<TExercise> | null {
  return readWorkoutDraft<TExercise>(storage, sessionName, clock.now().getTime())
}

export function discardWorkoutDraftSnapshot(storage: WorkoutStorage): WorkoutDraftWriteResult {
  try {
    clearWorkoutDraft(storage)
    return { ok: true }
  } catch { return { ok: false, reason: 'storage_unavailable' } }
}
