import { estimatedOneRepMax } from './records'
import type { AggregationResult, ProgressionClock } from './types'

export interface AnalyticsWorkoutSet {
  readonly completed?: boolean | null
  readonly exercise_id?: string | null
  readonly exercise_name?: string | null
  readonly weight?: number | null
  readonly reps?: number | null
  readonly rir?: number | null
  readonly created_at?: string | null
}

export interface AnalyticsWorkoutSession {
  readonly created_at?: string | null
  readonly workout_sets?: readonly AnalyticsWorkoutSet[] | null
}

export interface ExerciseProgressPoint {
  readonly date: string
  readonly e1rm: number
  readonly weight: number
  readonly reps: number
}

export interface ExerciseProgression {
  readonly exerciseList: readonly string[]
  readonly byExercise: Readonly<Record<string, readonly ExerciseProgressPoint[]>>
}

export function buildLegacyExerciseProgression(sessions: readonly AnalyticsWorkoutSession[]): ExerciseProgression {
  const groups = new Map<string, Map<string, Omit<ExerciseProgressPoint, 'date'>>>()
  for (const session of sessions) {
    for (const set of session.workout_sets ?? []) {
      if (!set.completed || !set.weight || set.weight <= 0 || !set.reps || set.reps <= 0) continue
      const name = set.exercise_name?.trim()
      const date = (set.created_at || session.created_at || '').slice(0, 10)
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const estimate = estimatedOneRepMax(set.weight, set.reps)
      if (estimate.status !== 'complete') continue
      const dates = groups.get(name) ?? new Map<string, Omit<ExerciseProgressPoint, 'date'>>()
      const previous = dates.get(date)
      if (!previous || estimate.value > previous.e1rm) dates.set(date, { e1rm: estimate.value, weight: set.weight, reps: set.reps })
      groups.set(name, dates)
    }
  }
  const exerciseList = [...groups.keys()].sort((a, b) => (groups.get(b)?.size ?? 0) - (groups.get(a)?.size ?? 0))
  const byExercise = Object.fromEntries(exerciseList.map(name => [name, [...(groups.get(name)?.entries() ?? [])]
    .map(([date, point]) => ({ date, ...point }))
    .sort((a, b) => a.date.localeCompare(b.date))]))
  return { exerciseList, byExercise }
}

export interface MuscleVolumePoint {
  readonly muscle: string
  readonly sets: number
  readonly tonnage: number
}

export interface MuscleRirPoint {
  readonly muscle: string
  readonly avgRir: number
  readonly count: number
}

function cutoff28Days(clock: ProgressionClock): number | null {
  const now = clock.now().getTime()
  return Number.isFinite(now) ? now - 28 * 86_400_000 : null
}

export function aggregateLegacyMuscleVolume28d(input: {
  readonly sessions: readonly AnalyticsWorkoutSession[]
  readonly muscleByExerciseId: ReadonlyMap<string, string>
  readonly clock: ProgressionClock
}): AggregationResult<readonly MuscleVolumePoint[]> {
  if (input.muscleByExerciseId.size === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'muscleByExerciseId' }] }
  const cutoff = cutoff28Days(input.clock)
  if (cutoff === null) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'clock' }] }
  const totals = new Map<string, { sets: number; tonnage: number }>()
  for (const session of input.sessions) for (const set of session.workout_sets ?? []) {
    if (!set.completed || !set.exercise_id) continue
    const instant = new Date(set.created_at || session.created_at || '').getTime()
    if (!Number.isFinite(instant) || instant < cutoff) continue
    const muscle = input.muscleByExerciseId.get(set.exercise_id)
    if (!muscle) continue
    const weight = set.weight ?? 0
    const reps = set.reps ?? 0
    if (![weight, reps].every(value => Number.isFinite(value) && value >= 0)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'sets' }] }
    const current = totals.get(muscle) ?? { sets: 0, tonnage: 0 }
    totals.set(muscle, { sets: current.sets + 1, tonnage: current.tonnage + weight * reps })
  }
  return { status: 'complete', value: [...totals].map(([muscle, value]) => ({ muscle, sets: value.sets, tonnage: Math.round(value.tonnage) })).sort((a, b) => b.sets - a.sets), issues: [] }
}

export function aggregateLegacyMuscleRir28d(input: {
  readonly sessions: readonly AnalyticsWorkoutSession[]
  readonly muscleByExerciseId: ReadonlyMap<string, string>
  readonly clock: ProgressionClock
  readonly minimumSets?: number
}): AggregationResult<readonly MuscleRirPoint[]> {
  if (input.muscleByExerciseId.size === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'muscleByExerciseId' }] }
  const cutoff = cutoff28Days(input.clock)
  if (cutoff === null) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'clock' }] }
  const totals = new Map<string, { sum: number; count: number }>()
  for (const session of input.sessions) for (const set of session.workout_sets ?? []) {
    if (!set.completed || !set.exercise_id || set.rir === null || set.rir === undefined) continue
    const instant = new Date(set.created_at || session.created_at || '').getTime()
    if (!Number.isFinite(instant) || instant < cutoff) continue
    const muscle = input.muscleByExerciseId.get(set.exercise_id)
    if (!muscle) continue
    if (!Number.isFinite(set.rir) || set.rir < 0) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'sets.rir' }] }
    const current = totals.get(muscle) ?? { sum: 0, count: 0 }
    totals.set(muscle, { sum: current.sum + set.rir, count: current.count + 1 })
  }
  const minimumSets = input.minimumSets ?? 5
  return { status: 'complete', value: [...totals].filter(([, value]) => value.count >= minimumSets)
    .map(([muscle, value]) => ({ muscle, avgRir: Math.round(value.sum / value.count * 10) / 10, count: value.count }))
    .sort((a, b) => a.avgRir - b.avgRir), issues: [] }
}
