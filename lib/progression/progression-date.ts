import { getHomeDayWindow, HOME_TIME_ZONE } from '../home/home-date'

export const PROGRESSION_TIME_ZONE = HOME_TIME_ZONE

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PROGRESSION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getProgressionDateKey(value: string | Date): string | null {
  if (typeof value === 'string' && DATE_KEY_PATTERN.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return dateKeyFormatter.format(date)
}

export function addProgressionDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function getProgressionWeekKey(value: string | Date): string | null {
  const dateKey = getProgressionDateKey(value)
  if (!dateKey) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
  return addProgressionDays(dateKey, -daysSinceMonday)
}

export interface ProgressionWeekWindow {
  weekKey: string
  start: Date
  end: Date
}

export function getProgressionWeekWindow(value: string | Date): ProgressionWeekWindow | null {
  const weekKey = getProgressionWeekKey(value)
  if (!weekKey) return null
  const endKey = addProgressionDays(weekKey, 7)

  // Noon UTC is safely inside the requested Zurich calendar date. The shared
  // Home helper then resolves the exact local midnight, including DST changes.
  const start = getHomeDayWindow(new Date(`${weekKey}T12:00:00.000Z`)).todayStart
  const end = getHomeDayWindow(new Date(`${endKey}T12:00:00.000Z`)).todayStart
  return { weekKey, start, end }
}

export function progressionPeriodStart(
  now: Date,
  days: number,
): string {
  const currentKey = getProgressionDateKey(now)
  if (!currentKey) throw new Error('Invalid progression date')
  return addProgressionDays(currentKey, -(days - 1))
}
