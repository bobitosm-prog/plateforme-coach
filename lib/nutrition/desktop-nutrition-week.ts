export const DESKTOP_NUTRITION_WEEK_PROJECTION = 'date, calories' as const

export interface DesktopNutritionWeekRow {
  readonly date?: unknown
  readonly calories?: unknown
}

export interface DesktopNutritionWeekWindowPoint {
  readonly date: string
  readonly day: string
}

export interface DesktopNutritionWeekWindow {
  readonly startInclusive: string
  readonly endInclusive: string
  readonly points: readonly DesktopNutritionWeekWindowPoint[]
}

export interface DesktopNutritionWeekPoint extends DesktopNutritionWeekWindowPoint {
  readonly calories: number | null
  readonly status: 'known' | 'missing' | 'unknown' | 'invalid'
}

export interface DesktopNutritionWeekIssue {
  readonly code:
    | 'invalid_date'
    | 'outside_window'
    | 'unknown_calories'
    | 'invalid_calories'
  readonly path: string
  readonly date?: string
}

export interface DesktopNutritionWeekAggregation {
  readonly status: 'complete' | 'partial' | 'empty' | 'unavailable' | 'invalid'
  readonly points: readonly DesktopNutritionWeekPoint[]
  readonly issues: readonly DesktopNutritionWeekIssue[]
}

interface DayAccumulator {
  sum: number
  knownCount: number
  unknown: boolean
  invalid: boolean
}

type CalorieRead =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' | 'invalid' }

const DAY_MS = 86_400_000

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const instant = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value
}

function readCalories(value: unknown): CalorieRead {
  if (value === null || value === undefined) return { status: 'unknown' }
  if (typeof value === 'string') {
    if (value.trim() === '') return { status: 'unknown' }
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0
      ? { status: 'known', value: parsed }
      : { status: 'invalid' }
  }
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? { status: 'known', value }
    : { status: 'invalid' }
}

export function createDesktopNutritionWeekWindow(
  now: Date,
): DesktopNutritionWeekWindow {
  if (!Number.isFinite(now.getTime())) throw new RangeError('invalid desktop nutrition clock')
  const points = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getTime() - (6 - index) * DAY_MS)
    return {
      date: day.toISOString().slice(0, 10),
      day: day.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase(),
    }
  })
  return {
    startInclusive: points[0].date,
    endInclusive: points[6].date,
    points,
  }
}

export function aggregateDesktopNutritionWeek(
  rows: readonly DesktopNutritionWeekRow[],
  window: DesktopNutritionWeekWindow,
): DesktopNutritionWeekAggregation {
  const byDate = new Map<string, DayAccumulator>()
  const issues: DesktopNutritionWeekIssue[] = []

  for (const [rowIndex, row] of rows.entries()) {
    if (!calendarDate(row.date)) {
      issues.push({ code: 'invalid_date', path: `rows.${rowIndex}.date` })
      continue
    }
    if (row.date < window.startInclusive || row.date > window.endInclusive) {
      issues.push({
        code: 'outside_window',
        path: `rows.${rowIndex}.date`,
        date: row.date,
      })
      continue
    }
    const accumulator = byDate.get(row.date) ?? {
      sum: 0,
      knownCount: 0,
      unknown: false,
      invalid: false,
    }
    byDate.set(row.date, accumulator)
    const calories = readCalories(row.calories)
    if (calories.status === 'known') {
      accumulator.sum += calories.value
      accumulator.knownCount += 1
      continue
    }
    accumulator[calories.status] = true
    issues.push({
      code: calories.status === 'unknown' ? 'unknown_calories' : 'invalid_calories',
      path: `rows.${rowIndex}.calories`,
      date: row.date,
    })
  }

  const points = window.points.map((slot): DesktopNutritionWeekPoint => {
    const day = byDate.get(slot.date)
    if (!day) return { ...slot, calories: null, status: 'missing' }
    if (day.invalid) return { ...slot, calories: null, status: 'invalid' }
    if (day.unknown) return { ...slot, calories: null, status: 'unknown' }
    if (day.knownCount > 0) {
      return { ...slot, calories: Math.round(day.sum), status: 'known' }
    }
    return { ...slot, calories: null, status: 'invalid' }
  })

  if (rows.length === 0) return { status: 'empty', points, issues }
  const knownCount = points.filter(point => point.status === 'known').length
  if (knownCount === points.length && issues.length === 0) {
    return { status: 'complete', points, issues }
  }
  if (knownCount > 0) return { status: 'partial', points, issues }
  return {
    status: issues.some(issue => (
      issue.code === 'invalid_date' ||
      issue.code === 'outside_window' ||
      issue.code === 'invalid_calories'
    )) ? 'invalid' : 'unavailable',
    points,
    issues,
  }
}

export type DesktopNutritionWeekReadResult =
  | { readonly status: 'ready'; readonly value: DesktopNutritionWeekAggregation }
  | { readonly status: 'failure' }

export interface DesktopNutritionWeekState {
  readonly status: 'loading' | 'ready' | 'failure'
  readonly value: DesktopNutritionWeekAggregation | null
  readonly ownerUserId: string | null
}

export function readDesktopNutritionWeekResponse(
  data: readonly DesktopNutritionWeekRow[] | null,
  error: unknown,
  window: DesktopNutritionWeekWindow,
): DesktopNutritionWeekReadResult {
  return error === null || error === undefined
    ? { status: 'ready', value: aggregateDesktopNutritionWeek(data ?? [], window) }
    : { status: 'failure' }
}

export function settleDesktopNutritionWeek(
  previous: DesktopNutritionWeekState,
  result: DesktopNutritionWeekReadResult,
  isCurrentRequest: boolean,
  ownerUserId: string,
): DesktopNutritionWeekState {
  if (!isCurrentRequest) return previous
  if (result.status === 'ready') {
    return { status: 'ready', value: result.value, ownerUserId }
  }
  return {
    status: 'failure',
    value: previous.ownerUserId === ownerUserId ? previous.value : null,
    ownerUserId,
  }
}
