import type { AppointmentInput } from './schema'
import type { CalendarPeriod } from './types'

type ModelResult<T> = { ok: true; data: T } | { ok: false; code: string }

function localParts(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(new Date(0))
    return true
  } catch {
    return false
  }
}

function addCivilDays(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00.000Z`)
  instant.setUTCDate(instant.getUTCDate() + days)
  return instant.toISOString().slice(0, 10)
}

export function localDateTimeToInstant(
  localDate: string,
  localTime: string,
  timeZone: string,
): ModelResult<string> {
  if (!isSupportedTimeZone(timeZone)) return { ok: false, code: 'TIMEZONE_INVALID' }
  const target = `${localDate}T${localTime}`
  const naive = Date.parse(`${target}:00Z`)
  if (!Number.isFinite(naive)) return { ok: false, code: 'DATE_INVALID' }

  const matches: string[] = []
  for (let minute = -14 * 60; minute <= 14 * 60; minute += 1) {
    const candidate = new Date(naive + minute * 60_000)
    if (localParts(candidate, timeZone) === target) matches.push(candidate.toISOString())
    if (matches.length > 1) return { ok: false, code: 'LOCAL_TIME_AMBIGUOUS' }
  }
  return matches.length === 1
    ? { ok: true, data: matches[0] }
    : { ok: false, code: 'LOCAL_TIME_NONEXISTENT' }
}

export function prepareAppointmentTimes(input: AppointmentInput): ModelResult<{
  scheduledAt: string
  durationMinutes: number
}> {
  const start = localDateTimeToInstant(input.localDate, input.startTime, input.timeZone)
  if (!start.ok) return start
  const end = localDateTimeToInstant(input.localDate, input.endTime, input.timeZone)
  if (!end.ok) return end
  const durationMinutes = (Date.parse(end.data) - Date.parse(start.data)) / 60_000
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, code: 'DURATION_INVALID' }
  }
  return { ok: true, data: { scheduledAt: start.data, durationMinutes } }
}

export function validateCalendarPeriod(
  input: CalendarPeriod,
  maximumDays = 366,
): ModelResult<CalendarPeriod> {
  const start = Date.parse(input.startInclusive)
  const end = Date.parse(input.endInclusive)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return { ok: false, code: 'PERIOD_INVALID' }
  }
  if ((end - start) / 86_400_000 > maximumDays) return { ok: false, code: 'PERIOD_TOO_LARGE' }
  return { ok: true, data: { ...input } }
}

export function calendarWeekPeriod(
  clock: Readonly<{ now(): Date }>,
  timeZone: string,
  offsetWeeks = 0,
): ModelResult<CalendarPeriod> {
  if (!Number.isInteger(offsetWeeks) || Math.abs(offsetWeeks) > 520) {
    return { ok: false, code: 'WEEK_OFFSET_INVALID' }
  }
  const now = clock.now()
  if (!Number.isFinite(now.getTime()) || !isSupportedTimeZone(timeZone)) {
    return { ok: false, code: 'CLOCK_OR_TIMEZONE_INVALID' }
  }
  const localDate = localParts(now, timeZone).slice(0, 10)
  const weekday = new Date(`${localDate}T00:00:00.000Z`).getUTCDay() || 7
  const monday = addCivilDays(localDate, 1 - weekday + offsetWeeks * 7)
  const followingMonday = addCivilDays(monday, 7)
  const start = localDateTimeToInstant(monday, '00:00', timeZone)
  const endExclusive = localDateTimeToInstant(followingMonday, '00:00', timeZone)
  if (!start.ok || !endExclusive.ok) return { ok: false, code: 'WEEK_BOUNDARY_INVALID' }
  return {
    ok: true,
    data: {
      startInclusive: start.data,
      endInclusive: new Date(Date.parse(endExclusive.data) - 1).toISOString(),
    },
  }
}

export function upcomingCalendarPeriod(
  clock: Readonly<{ now(): Date }>,
  days = 366,
): ModelResult<CalendarPeriod> {
  const now = clock.now()
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(days) || days < 1 || days > 366) {
    return { ok: false, code: 'UPCOMING_PERIOD_INVALID' }
  }
  return {
    ok: true,
    data: {
      startInclusive: now.toISOString(),
      endInclusive: new Date(now.getTime() + days * 86_400_000).toISOString(),
    },
  }
}

export function sortAppointments<T extends Readonly<{ scheduled_at: string; id: string }>>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) =>
    left.scheduled_at.localeCompare(right.scheduled_at) || left.id.localeCompare(right.id))
}
