export interface HomeCalorieMiniGraphRow {
  readonly date?: unknown
  readonly calories?: unknown
}

export interface HomeCalorieMiniGraphWindow {
  readonly startInclusive: string
  readonly endInclusive: string
}

export interface HomeCalorieMiniGraphPoint {
  readonly date: string
  readonly calories: number | null
  readonly status: 'known' | 'missing' | 'unknown' | 'invalid'
}

export interface HomeCalorieMiniGraphIssue {
  readonly code:
    | 'invalid_window'
    | 'invalid_date'
    | 'outside_window'
    | 'unknown_calories'
    | 'invalid_calories'
  readonly path: string
  readonly date?: string
}

export interface HomeCalorieMiniGraphAggregation {
  readonly status: 'complete' | 'partial' | 'empty' | 'unavailable' | 'invalid'
  readonly points: readonly HomeCalorieMiniGraphPoint[]
  readonly issues: readonly HomeCalorieMiniGraphIssue[]
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
const MAX_WINDOW_DAYS = 32

function calendarDateInstant(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const instant = new Date(`${value}T00:00:00.000Z`).getTime()
  return Number.isFinite(instant) &&
    new Date(instant).toISOString().slice(0, 10) === value
    ? instant
    : null
}

function datesInWindow(window: HomeCalorieMiniGraphWindow): string[] | null {
  const start = calendarDateInstant(window.startInclusive)
  const end = calendarDateInstant(window.endInclusive)
  if (start === null || end === null || start > end) return null
  const dayCount = Math.round((end - start) / DAY_MS) + 1
  if (dayCount < 1 || dayCount > MAX_WINDOW_DAYS) return null
  return Array.from(
    { length: dayCount },
    (_, index) => new Date(start + index * DAY_MS).toISOString().slice(0, 10),
  )
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

export function aggregateHomeCalorieMiniGraph(
  rows: readonly HomeCalorieMiniGraphRow[],
  window: HomeCalorieMiniGraphWindow,
): HomeCalorieMiniGraphAggregation {
  const dates = datesInWindow(window)
  if (!dates) {
    return {
      status: 'invalid',
      points: [],
      issues: [{ code: 'invalid_window', path: 'window' }],
    }
  }

  const days = new Map<string, DayAccumulator>()
  const issues: HomeCalorieMiniGraphIssue[] = []
  for (const [index, row] of rows.entries()) {
    const dateInstant = calendarDateInstant(row.date)
    if (dateInstant === null) {
      issues.push({ code: 'invalid_date', path: `rows.${index}.date` })
      continue
    }
    const date = row.date as string
    if (date < window.startInclusive || date > window.endInclusive) {
      issues.push({ code: 'outside_window', path: `rows.${index}.date`, date })
      continue
    }

    const accumulator = days.get(date) ?? {
      sum: 0,
      knownCount: 0,
      unknown: false,
      invalid: false,
    }
    days.set(date, accumulator)
    const calorie = readCalories(row.calories)
    if (calorie.status === 'known') {
      accumulator.sum += calorie.value
      accumulator.knownCount += 1
    } else {
      accumulator[calorie.status] = true
      issues.push({
        code: calorie.status === 'unknown' ? 'unknown_calories' : 'invalid_calories',
        path: `rows.${index}.calories`,
        date,
      })
    }
  }

  const points = dates.map((date): HomeCalorieMiniGraphPoint => {
    const day = days.get(date)
    if (!day) return { date, calories: null, status: 'missing' }
    if (day.unknown) return { date, calories: null, status: 'unknown' }
    if (day.knownCount > 0) return { date, calories: day.sum, status: 'known' }
    return { date, calories: null, status: 'invalid' }
  })
  if (rows.length === 0) return { status: 'empty', points, issues }

  const knownCount = points.filter(point => point.status === 'known').length
  if (knownCount === points.length && issues.length === 0) {
    return { status: 'complete', points, issues }
  }
  if (knownCount > 0) return { status: 'partial', points, issues }
  return {
    status: issues.some(issue => (
      issue.code === 'invalid_window' ||
      issue.code === 'invalid_date' ||
      issue.code === 'invalid_calories'
    )) ? 'invalid' : 'unavailable',
    points,
    issues,
  }
}

export function settleHomeCalorieMiniGraph<T extends readonly HomeCalorieMiniGraphPoint[]>(
  previous: T,
  result: { readonly status: 'ready'; readonly points: T } | { readonly status: 'failure' },
  isCurrentRequest: boolean,
): T {
  if (!isCurrentRequest || result.status === 'failure') return previous
  return result.points
}
