import { normalizeExerciseName } from '../exercise-matching'
import type { PrevSessionSet } from './compute-progression'

export const PREVIOUS_PERFORMANCE_SETS_PER_EXERCISE = 30
export const PREVIOUS_PERFORMANCE_MAX_ROWS = 240

export interface PreviousExerciseReference {
  key: string
  exerciseId: string | null
  name: string
}

export interface PreviousPerformanceRow {
  exercise_id?: string | null
  exercise_name?: string | null
  weight?: number | null
  reps?: number | null
  rir?: number | null
  set_number?: number | null
  session_id?: string | null
  completed?: boolean | null
  created_at?: string | null
}

export interface PreviousPerformance {
  state: 'ready' | 'no_history' | 'error'
  lastWeight: number | null
  lastReps: number | null
  lastRir: number | null
  lastPerformedAt: string | null
  latestSets: PrevSessionSet[]
  sessions: PrevSessionSet[][]
}

function emptyPerformance(state: PreviousPerformance['state']): PreviousPerformance {
  return {
    state,
    lastWeight: null,
    lastReps: null,
    lastRir: null,
    lastPerformedAt: null,
    latestSets: [],
    sessions: [],
  }
}

function matchesReference(row: PreviousPerformanceRow, reference: PreviousExerciseReference): boolean {
  if (reference.exerciseId && row.exercise_id === reference.exerciseId) return true
  if (!row.exercise_name) return false
  return normalizeExerciseName(row.exercise_name) === normalizeExerciseName(reference.name)
}

export function getPreviousPerformanceLimit(exerciseCount: number): number {
  return Math.min(
    PREVIOUS_PERFORMANCE_MAX_ROWS,
    Math.max(PREVIOUS_PERFORMANCE_SETS_PER_EXERCISE, exerciseCount * PREVIOUS_PERFORMANCE_SETS_PER_EXERCISE),
  )
}

export function buildPreviousPerformanceMap(
  references: readonly PreviousExerciseReference[],
  rows: readonly PreviousPerformanceRow[],
  failed = false,
): Record<string, PreviousPerformance> {
  return Object.fromEntries(references.map(reference => {
    if (failed) return [reference.key, emptyPerformance('error')]

    const matchingRows = rows
      .filter(row => row.completed !== false && matchesReference(row, reference))
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    if (matchingRows.length === 0) return [reference.key, emptyPerformance('no_history')]

    const sessionOrder: string[] = []
    const grouped = new Map<string, PreviousPerformanceRow[]>()
    for (const row of matchingRows) {
      const sessionKey = row.session_id || `performed:${row.created_at || 'unknown'}`
      if (!grouped.has(sessionKey)) {
        grouped.set(sessionKey, [])
        sessionOrder.push(sessionKey)
      }
      grouped.get(sessionKey)!.push(row)
    }

    const sessions = sessionOrder.slice(0, 2).map(sessionKey => (
      grouped.get(sessionKey)!
        .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
        .map(row => ({
          weight: Number(row.weight) || 0,
          reps: Number(row.reps) || 0,
          completed: row.completed !== false,
          rir: typeof row.rir === 'number' ? row.rir : null,
        }))
    ))
    const latestSets = sessions[0] ?? []
    const lastSet = latestSets.at(-1) ?? null

    return [reference.key, {
      state: 'ready',
      lastWeight: lastSet?.weight ?? null,
      lastReps: lastSet?.reps ?? null,
      lastRir: lastSet?.rir ?? null,
      lastPerformedAt: matchingRows[0]?.created_at ?? null,
      latestSets,
      sessions,
    } satisfies PreviousPerformance]
  }))
}

export interface SetPrefillInput {
  draftWeight: number | ''
  draftWeightRaw: string
  draftReps: number | ''
  prescribedWeight?: number | null
  prescribedReps?: number | null
  previousWeight?: number | null
  previousReps?: number | null
}

export interface SetPrefillResult {
  weight: number | ''
  weightRaw: string
  reps: number | ''
  weightSource: 'draft' | 'prescription' | 'previous' | 'empty'
  repsSource: 'draft' | 'prescription' | 'previous' | 'empty'
}

function displayWeight(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

export function resolveCurrentSetPrefill(input: SetPrefillInput): SetPrefillResult {
  const hasDraftWeight = input.draftWeightRaw.trim() !== '' || input.draftWeight !== ''
  const weight = hasDraftWeight
    ? input.draftWeight
    : input.prescribedWeight != null
      ? input.prescribedWeight
      : input.previousWeight != null
        ? input.previousWeight
        : ''
  const weightSource = hasDraftWeight
    ? 'draft'
    : input.prescribedWeight != null
      ? 'prescription'
      : input.previousWeight != null
        ? 'previous'
        : 'empty'

  const hasDraftReps = input.draftReps !== ''
  const reps = hasDraftReps
    ? input.draftReps
    : input.prescribedReps != null
      ? input.prescribedReps
      : input.previousReps != null
        ? input.previousReps
        : ''
  const repsSource = hasDraftReps
    ? 'draft'
    : input.prescribedReps != null
      ? 'prescription'
      : input.previousReps != null
        ? 'previous'
        : 'empty'

  return {
    weight,
    weightRaw: hasDraftWeight && input.draftWeightRaw.trim() !== ''
      ? input.draftWeightRaw
      : weight === '' ? '' : displayWeight(weight),
    reps,
    weightSource,
    repsSource,
  }
}

export function adjustWeightValue(value: string, delta: number, step: number): string {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  const current = Number.isFinite(parsed) ? parsed : 0
  return displayWeight(Math.max(0, current + delta * step))
}

export function adjustRepsValue(value: number | '', delta: number): number {
  return Math.max(0, (value === '' ? 0 : value) + delta)
}
