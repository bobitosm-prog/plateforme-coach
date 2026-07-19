import { calendarDateAt, mondayWeekBounds } from './dates'
import { propagateAggregationFailure, type AggregationIssue, type AggregationResult } from './types'

export interface TrainingSetInput {
  readonly exerciseId?: string | null
  readonly exerciseName?: string | null
  readonly completed?: boolean | null
  readonly weight?: number | null
  readonly reps?: number | null
}

export function durationMinutes(input: { readonly startedAt: Date; readonly endedAt: Date }): AggregationResult<number> {
  const start = input.startedAt.getTime()
  const end = input.endedAt.getTime()
  if (![start, end].every(Number.isFinite) || end < start) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'duration' }] }
  return { status: 'complete', value: (end - start) / 60_000, issues: [] }
}

export function groupCompletedSetsByExercise(
  sets: readonly TrainingSetInput[],
): AggregationResult<readonly { exerciseKey: string; totals: TrainingSetTotals }[]> {
  if (sets.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'sets' }] }
  const groups = new Map<string, TrainingSetInput[]>()
  for (const [index, set] of sets.entries()) {
    const key = set.exerciseId?.trim() || set.exerciseName?.trim()
    if (!key) return { status: 'invalid', value: null, issues: [{ code: 'missing_value', path: `sets.${index}.exercise` }] }
    groups.set(key, [...(groups.get(key) ?? []), set])
  }
  const value: { exerciseKey: string; totals: TrainingSetTotals }[] = []
  const issues: AggregationIssue[] = []
  for (const [exerciseKey, exerciseSets] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const result = aggregateCompletedSets(exerciseSets)
    if (result.status === 'invalid' || result.status === 'unavailable') return propagateAggregationFailure(result)
    value.push({ exerciseKey, totals: result.value })
    issues.push(...result.issues)
  }
  return { status: issues.length ? 'partial' : 'complete', value, issues }
}

export interface TrainingSetTotals {
  readonly setCount: number
  readonly repetitions: number | null
  readonly tonnage: number | null
}

export function aggregateCompletedSets(sets: readonly TrainingSetInput[]): AggregationResult<TrainingSetTotals> {
  if (sets.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'sets' }] }
  const completed = sets.filter(set => set.completed === true)
  if (completed.length === 0) return { status: 'complete', value: { setCount: 0, repetitions: 0, tonnage: 0 }, issues: [] }
  const issues: AggregationIssue[] = []
  let repetitions = 0
  let tonnage = 0
  for (const [index, set] of completed.entries()) {
    for (const [key, value] of [['weight', set.weight], ['reps', set.reps]] as const) {
      if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) {
        return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: `sets.${index}.${key}` }] }
      }
      if (value === null || value === undefined) issues.push({ code: 'missing_value', path: `sets.${index}.${key}` })
    }
    if (set.reps !== null && set.reps !== undefined) repetitions += set.reps
    if (set.weight !== null && set.weight !== undefined && set.reps !== null && set.reps !== undefined) tonnage += set.weight * set.reps
  }
  return {
    status: issues.length ? 'partial' : 'complete',
    value: { setCount: completed.length, repetitions: issues.some(issue => issue.path.endsWith('.reps')) ? null : repetitions, tonnage: issues.length ? null : tonnage },
    issues,
  }
}

export function legacyTonnage(sets: readonly TrainingSetInput[]): number {
  return sets.reduce((sum, set) => sum + (set.weight || 0) * (set.reps || 0), 0)
}

export interface DatedTrainingSet extends TrainingSetInput {
  readonly createdAt: string
}

export function groupLegacyWeeklyTonnage(input: {
  readonly sets: readonly DatedTrainingSet[]
  readonly timeZone: string
}): AggregationResult<readonly { week: string; volume: number }[]> {
  if (input.sets.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'sets' }] }
  const totals = new Map<string, number>()
  for (const [index, set] of input.sets.entries()) {
    if (set.completed === false) continue
    const instant = new Date(set.createdAt)
    const date = calendarDateAt(instant, input.timeZone)
    if (date.status !== 'complete') return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: `sets.${index}.createdAt` }] }
    const week = mondayWeekBounds(date.value)
    if (week.status !== 'complete') return propagateAggregationFailure(week)
    totals.set(week.value.startInclusive, (totals.get(week.value.startInclusive) ?? 0) + legacyTonnage([set]))
  }
  return { status: 'complete', value: [...totals].map(([week, volume]) => ({ week, volume: Math.round(volume) })).sort((a, b) => a.week.localeCompare(b.week)), issues: [] }
}

export function percentageChangeLegacy(values: readonly number[]): AggregationResult<number> {
  if (values.length < 2 || values.at(-2) === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'values' }] }
  if (values.some(value => !Number.isFinite(value) || value < 0)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_number', path: 'values' }] }
  const previous = values.at(-2) as number
  const latest = values.at(-1) as number
  return { status: 'complete', value: Math.round(((latest - previous) / previous) * 100), issues: [] }
}

export function sumLegacyWeeklyVolume(values: readonly { readonly volume: number }[]): number {
  return values.reduce((sum, item) => sum + item.volume, 0)
}
