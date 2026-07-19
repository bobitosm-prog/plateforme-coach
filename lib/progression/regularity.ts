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

export function legacyCoachStreak(completedUtcDates: readonly string[], today: Date): AggregationResult<number> {
  if (!Number.isFinite(today.getTime())) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'today' }] }
  if (completedUtcDates.length === 0) return { status: 'complete', value: 0, issues: [] }
  const dates = [...new Set(completedUtcDates.map(value => value.slice(0, 10)))].sort((a, b) => b.localeCompare(a))
  if (dates.some(value => !/^\d{4}-\d{2}-\d{2}$/.test(value))) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'dates' }] }
  let count = 0
  let cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  for (const value of dates) {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    if (Math.round((cursor.getTime() - date.getTime()) / 86_400_000) <= 1) {
      count += 1
      cursor = date
    } else break
  }
  return { status: 'complete', value: count, issues: [] }
}
