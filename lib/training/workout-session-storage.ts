export const ACTIVE_WORKOUT_STORAGE_KEY = 'moovx_active_workout'
export const WORKOUT_DRAFT_STORAGE_KEY = 'moovx_workout_draft'
export const WORKOUT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface WorkoutStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface StoredWorkoutDraft<TExercise> {
  sessionName: string
  startedAt: string
  savedAt: string
  exos: TExercise[]
}

export function readActiveWorkout<T>(storage: WorkoutStorage): T | null {
  try {
    const raw = storage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function writeActiveWorkout(storage: WorkoutStorage, value: unknown): void {
  storage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(value))
}

export function clearActiveWorkout(storage: WorkoutStorage): void {
  storage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
}

export function readWorkoutDraft<TExercise>(
  storage: WorkoutStorage,
  sessionName: string,
  nowMs: number = Date.now(),
): StoredWorkoutDraft<TExercise> | null {
  try {
    const raw = storage.getItem(WORKOUT_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<StoredWorkoutDraft<TExercise>>
    if (draft.sessionName !== sessionName) return null
    const savedAtMs = new Date(String(draft.savedAt)).getTime()
    if ((nowMs - savedAtMs) > WORKOUT_DRAFT_MAX_AGE_MS) return null
    if (!Array.isArray(draft.exos)) return null
    return draft as StoredWorkoutDraft<TExercise>
  } catch {
    return null
  }
}

export function writeWorkoutDraft<TExercise>(storage: WorkoutStorage, draft: StoredWorkoutDraft<TExercise>): void {
  storage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearWorkoutDraft(storage: WorkoutStorage): void {
  storage.removeItem(WORKOUT_DRAFT_STORAGE_KEY)
}
