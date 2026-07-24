import {
  addCalendarDays,
  calendarDateAt,
  inCalendarWindow,
  isCalendarDate,
  mondayWeekBounds,
  type CalendarDate,
} from '@/lib/progression'

export interface WeeklyDiagnosticNutritionWindow {
  readonly startInclusive: CalendarDate
  readonly endExclusive: CalendarDate
}

export interface WeeklyDiagnosticNutritionRow {
  readonly date?: unknown
  readonly calories?: unknown
  readonly protein?: unknown
  readonly carbs?: unknown
  readonly fat?: unknown
}

export type WeeklyDiagnosticNutrientRead =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' | 'invalid'; readonly value: null }

export interface WeeklyDiagnosticMetricAggregate {
  readonly average: number | null
  readonly knownDays: number
  readonly unknownDays: number
  readonly invalidDays: number
}

export interface WeeklyDiagnosticNutritionIssue {
  readonly code:
    | 'invalid_date'
    | 'outside_week'
    | 'unknown_calories'
    | 'invalid_calories'
    | 'unknown_protein'
    | 'invalid_protein'
  readonly path: string
}

export interface WeeklyDiagnosticNutritionAggregate {
  readonly status: 'complete' | 'partial' | 'unavailable' | 'invalid'
  readonly daysLogged: number
  readonly calories: WeeklyDiagnosticMetricAggregate
  readonly protein: WeeklyDiagnosticMetricAggregate
  readonly issues: readonly WeeklyDiagnosticNutritionIssue[]
}

interface MutableMetricDay {
  status: WeeklyDiagnosticNutrientRead['status']
  sum: number
}

export function readWeeklyDiagnosticNutrient(value: unknown): WeeklyDiagnosticNutrientRead {
  if (value === null || value === undefined) return { status: 'unknown', value: null }
  if (typeof value === 'string' && value.trim() === '') {
    return { status: 'unknown', value: null }
  }
  if (typeof value !== 'number' && typeof value !== 'string') {
    return { status: 'invalid', value: null }
  }
  const numeric = typeof value === 'number' ? value : Number(value.trim())
  return Number.isFinite(numeric) && numeric >= 0
    ? { status: 'known', value: numeric }
    : { status: 'invalid', value: null }
}

export function presentWeeklyDiagnosticMetric(
  value: unknown,
  decimals: number,
  suffix = '',
): string {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 10
    ? `${value.toFixed(decimals)}${suffix}`
    : '—'
}

export function previousCompleteZurichWeek(now: Date): WeeklyDiagnosticNutritionWindow {
  const today = calendarDateAt(now, 'Europe/Zurich')
  if (today.status !== 'complete') throw new RangeError('invalid diagnostic clock')
  const currentWeek = mondayWeekBounds(today.value)
  if (currentWeek.status !== 'complete') throw new RangeError('invalid diagnostic week')
  const start = addCalendarDays(currentWeek.value.startInclusive, -7)
  if (start.status !== 'complete') throw new RangeError('invalid diagnostic week')
  return {
    startInclusive: start.value,
    endExclusive: currentWeek.value.startInclusive,
  }
}

function mergeMetricDay(
  previous: MutableMetricDay | undefined,
  read: WeeklyDiagnosticNutrientRead,
): MutableMetricDay {
  if (!previous) {
    return {
      status: read.status,
      sum: read.status === 'known' ? read.value : 0,
    }
  }
  if (previous.status === 'invalid' || read.status === 'invalid') {
    return { status: 'invalid', sum: 0 }
  }
  if (previous.status === 'unknown' || read.status === 'unknown') {
    return { status: 'unknown', sum: 0 }
  }
  if (read.status !== 'known') return { status: 'invalid', sum: 0 }
  return { status: 'known', sum: previous.sum + read.value }
}

function aggregateMetric(days: ReadonlyMap<string, MutableMetricDay>): WeeklyDiagnosticMetricAggregate {
  const known = [...days.values()].filter(day => day.status === 'known')
  const total = known.reduce((sum, day) => sum + day.sum, 0)
  return {
    average: known.length > 0 ? total / known.length : null,
    knownDays: known.length,
    unknownDays: [...days.values()].filter(day => day.status === 'unknown').length,
    invalidDays: [...days.values()].filter(day => day.status === 'invalid').length,
  }
}

export function aggregateWeeklyDiagnosticNutrition(
  rows: readonly WeeklyDiagnosticNutritionRow[],
  window: WeeklyDiagnosticNutritionWindow,
): WeeklyDiagnosticNutritionAggregate {
  if (
    !isCalendarDate(window.startInclusive) ||
    !isCalendarDate(window.endExclusive) ||
    window.startInclusive >= window.endExclusive
  ) {
    const empty = { average: null, knownDays: 0, unknownDays: 0, invalidDays: 0 }
    return {
      status: 'invalid',
      daysLogged: 0,
      calories: empty,
      protein: empty,
      issues: [{ code: 'invalid_date', path: 'window' }],
    }
  }

  const loggedDates = new Set<string>()
  const caloriesByDate = new Map<string, MutableMetricDay>()
  const proteinByDate = new Map<string, MutableMetricDay>()
  const issues: WeeklyDiagnosticNutritionIssue[] = []

  for (const [index, row] of rows.entries()) {
    if (typeof row.date !== 'string' || !isCalendarDate(row.date)) {
      issues.push({ code: 'invalid_date', path: `rows.${index}.date` })
      continue
    }
    if (!inCalendarWindow(row.date, window)) {
      issues.push({ code: 'outside_week', path: `rows.${index}.date` })
      continue
    }

    loggedDates.add(row.date)
    const calories = readWeeklyDiagnosticNutrient(row.calories)
    const protein = readWeeklyDiagnosticNutrient(row.protein)
    caloriesByDate.set(row.date, mergeMetricDay(caloriesByDate.get(row.date), calories))
    proteinByDate.set(row.date, mergeMetricDay(proteinByDate.get(row.date), protein))

    if (calories.status !== 'known') {
      issues.push({
        code: calories.status === 'unknown' ? 'unknown_calories' : 'invalid_calories',
        path: `rows.${index}.calories`,
      })
    }
    if (protein.status !== 'known') {
      issues.push({
        code: protein.status === 'unknown' ? 'unknown_protein' : 'invalid_protein',
        path: `rows.${index}.protein`,
      })
    }
  }

  const calories = aggregateMetric(caloriesByDate)
  const protein = aggregateMetric(proteinByDate)
  const noKnownMetric = calories.knownDays === 0 && protein.knownDays === 0
  const complete = loggedDates.size === 7 &&
    calories.knownDays === 7 &&
    protein.knownDays === 7 &&
    issues.length === 0
  return {
    status: noKnownMetric ? 'unavailable' : complete ? 'complete' : 'partial',
    daysLogged: loggedDates.size,
    calories,
    protein,
    issues,
  }
}
