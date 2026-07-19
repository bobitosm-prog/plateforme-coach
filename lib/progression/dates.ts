import { propagateAggregationFailure, type AggregationResult, type ProgressionClock } from './types'

export type CalendarDate = `${number}-${number}-${number}`

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isCalendarDate(value: string): value is CalendarDate {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function calendarDateAt(instant: Date, timeZone: string): AggregationResult<CalendarDate> {
  if (!Number.isFinite(instant.getTime())) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'instant' }] }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
    const value = `${pick('year')}-${pick('month')}-${pick('day')}`
    return isCalendarDate(value) ? { status: 'complete', value, issues: [] } : { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'instant' }] }
  } catch {
    return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'timeZone' }] }
  }
}

export function addCalendarDays(date: CalendarDate, days: number): AggregationResult<CalendarDate> {
  if (!isCalendarDate(date) || !Number.isInteger(days)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'date' }] }
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  const value = next.toISOString().slice(0, 10)
  return { status: 'complete', value: value as CalendarDate, issues: [] }
}

export function mondayWeekBounds(date: CalendarDate): AggregationResult<{ startInclusive: CalendarDate; endExclusive: CalendarDate }> {
  if (!isCalendarDate(date)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'date' }] }
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7
  const start = addCalendarDays(date, 1 - weekday)
  if (start.status !== 'complete') return propagateAggregationFailure(start)
  const end = addCalendarDays(start.value, 7)
  if (end.status !== 'complete') return propagateAggregationFailure(end)
  return { status: 'complete', value: { startInclusive: start.value, endExclusive: end.value }, issues: [] }
}

export function civilMonthBounds(date: CalendarDate): AggregationResult<{ startInclusive: CalendarDate; endExclusive: CalendarDate }> {
  if (!isCalendarDate(date)) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'date' }] }
  const [year, month] = date.split('-').map(Number)
  const startInclusive = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01` as CalendarDate
  const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10) as CalendarDate
  return { status: 'complete', value: { startInclusive, endExclusive: end }, issues: [] }
}

export function rollingCalendarWindow(input: {
  readonly days: 7 | 28 | 30
  readonly clock: ProgressionClock
  readonly timeZone: string
}): AggregationResult<{ startInclusive: CalendarDate; endExclusive: CalendarDate }> {
  const today = calendarDateAt(input.clock.now(), input.timeZone)
  if (today.status !== 'complete') return propagateAggregationFailure(today)
  const start = addCalendarDays(today.value, -(input.days - 1))
  const end = addCalendarDays(today.value, 1)
  if (start.status !== 'complete') return propagateAggregationFailure(start)
  if (end.status !== 'complete') return propagateAggregationFailure(end)
  return { status: 'complete', value: { startInclusive: start.value, endExclusive: end.value }, issues: [] }
}

export function inCalendarWindow(date: string, bounds: { readonly startInclusive: CalendarDate; readonly endExclusive: CalendarDate }): boolean {
  return isCalendarDate(date) && date >= bounds.startInclusive && date < bounds.endExclusive
}

interface ZonedParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

function zonedParts(instant: Date, timeZone: string): ZonedParts | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant)
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
    const result = { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute'), second: value('second') }
    return Object.values(result).every(Number.isFinite) ? result : null
  } catch { return null }
}

function instantForZonedParts(parts: ZonedParts, milliseconds: number, timeZone: string): Date | null {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, milliseconds)
  let candidate = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = zonedParts(new Date(candidate), timeZone)
    if (!observed) return null
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second, milliseconds)
    candidate += desired - observedAsUtc
  }
  return new Date(candidate)
}

/** Reproduces the historical local-weekday shift followed by UTC truncation. */
export function legacyMixedLocalUtcMondayKey(instantValue: string, timeZone: string): AggregationResult<CalendarDate> {
  const instant = new Date(instantValue)
  if (!Number.isFinite(instant.getTime())) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'instant' }] }
  const local = zonedParts(instant, timeZone)
  if (!local) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'timeZone' }] }
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day))
  const weekday = localDate.getUTCDay()
  localDate.setUTCDate(localDate.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  const mondayInstant = instantForZonedParts({ ...local, year: localDate.getUTCFullYear(), month: localDate.getUTCMonth() + 1, day: localDate.getUTCDate() }, instant.getUTCMilliseconds(), timeZone)
  if (!mondayInstant) return { status: 'invalid', value: null, issues: [{ code: 'invalid_date', path: 'timeZone' }] }
  return { status: 'complete', value: mondayInstant.toISOString().slice(0, 10) as CalendarDate, issues: [] }
}
