import { computeStreak, type StreakResult } from '../streak'
import { mondayWeekBounds } from './dates'
import type { AggregationResult } from './types'

export function activeMondayWeeks(localDates: readonly string[]): AggregationResult<readonly string[]> {
  if (localDates.length === 0) return { status: 'unavailable', value: null, issues: [{ code: 'empty_input', path: 'dates' }] }
  const weeks = new Set<string>()
  for (const [index, date] of localDates.entries()) {
    const bounds = mondayWeekBounds(date as `${number}-${number}-${number}`)
    if (bounds.status !== 'complete') return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: `dates.${index}` }] }
    weeks.add(bounds.value.startInclusive)
  }
  return { status: 'complete', value: [...weeks].sort(), issues: [] }
}

export function trainingStreak(input: {
  readonly completedLocalDates: readonly string[]
  readonly restLocalDates: readonly string[]
  readonly todayLocal: string
}): AggregationResult<StreakResult> {
  if (![...input.completedLocalDates, ...input.restLocalDates, input.todayLocal].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value))) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'dates' }] }
  return { status: 'complete', value: computeStreak([...input.completedLocalDates], input.todayLocal, [...input.restLocalDates]), issues: [] }
}
