import { canonicalExerciseName, foldExerciseName } from './exercise-identity'

export const LOAD_MODES = ['barbell_total', 'total', 'two_dumbbells', 'one_dumbbell', 'unilateral_both', 'external_only', 'band', 'unquantified', 'legacy'] as const
export type LoadMode = typeof LOAD_MODES[number]
export function isLoadMode(value: unknown): value is LoadMode { return LOAD_MODES.includes(value as LoadMode) }

/** New prescriptions only. Logged historical sets without a mode stay legacy, never silently doubled. */
export function defaultLoadMode(row: Record<string, unknown>): LoadMode {
  if (isLoadMode(row.loadMode ?? row.load_mode)) return (row.loadMode ?? row.load_mode) as LoadMode
  const name = foldExerciseName(canonicalExerciseName(String(row.name ?? row.exercise_name ?? row.custom_name ?? '')))
  if (/ab roller|roue abdominale|battle ropes?/.test(name) || row.equipment === 'ab_wheel' || row.equipment === 'battle_rope') return 'unquantified'
  if (/elastique|\bband\b/.test(name) || row.equipment === 'band') return 'band'
  if (/haltere|dumbbell/.test(name) || row.equipment === 'dumbbell') {
    if (/un bras|une main|unilateral/.test(name)) return 'unilateral_both'
    if (/goblet|pull over|pullover|\bhaltere\b/.test(name)) return 'one_dumbbell'
    return 'two_dumbbells'
  }
  if (/poids du corps|pompes|tractions|\bdips\b/.test(name) || row.equipment === 'bodyweight') return 'external_only'
  if (/\bbarre\b|barbell/.test(name) || row.equipment === 'barbell') return 'barbell_total'
  return 'total'
}

export function setTonnage(set: {weight?: unknown; reps?: unknown; completed?: boolean | null; done?: boolean; duration_seconds?: unknown; durationSeconds?: unknown; load_mode?: unknown; loadMode?: unknown}): number {
  if (set.completed === false || set.done === false || Number(set.duration_seconds ?? set.durationSeconds) > 0) return 0
  const mode = set.load_mode ?? set.loadMode
  if (mode === 'band' || mode === 'unquantified') return 0 // Not a quantified constant lifted mass.
  const weight = Number(set.weight), reps = Number(set.reps)
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0
  return weight * reps * (mode === 'two_dumbbells' || mode === 'unilateral_both' ? 2 : 1)
}
