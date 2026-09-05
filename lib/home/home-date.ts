export const HOME_TIME_ZONE = 'Europe/Zurich' as const
const HOME_WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const

export interface HomeDayWindow {
  date: Date
  timezone: typeof HOME_TIME_ZONE
  localDateKey: string
  todayStart: Date
  todayEnd: Date
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const zurichDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: HOME_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function zonedParts(date: Date): ZonedParts {
  const values = Object.fromEntries(
    zurichDateTime
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]),
  )

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function localMidnightUtc(year: number, month: number, day: number): Date {
  const desiredAsUtc = Date.UTC(year, month - 1, day)
  let candidate = desiredAsUtc

  // Resolve the Zurich offset for the target instant. A second pass handles
  // offset changes around daylight-saving boundaries.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = zonedParts(new Date(candidate))
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    candidate = desiredAsUtc - (representedAsUtc - candidate)
  }

  return new Date(candidate)
}

function nextCalendarDay(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>) {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

export function getHomeDayWindow(now = new Date()): HomeDayWindow {
  const parts = zonedParts(now)
  const next = nextCalendarDay(parts)
  const localDateKey = [parts.year, parts.month, parts.day]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
    .join('-')

  return {
    date: now,
    timezone: HOME_TIME_ZONE,
    localDateKey,
    todayStart: localMidnightUtc(parts.year, parts.month, parts.day),
    todayEnd: localMidnightUtc(next.year, next.month, next.day),
  }
}

export function isInHomeDay(timestamp: string | Date, day: HomeDayWindow): boolean {
  const value = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (Number.isNaN(value.getTime())) return false
  return value >= day.todayStart && value < day.todayEnd
}

export function getHomeNutritionDayKey(day: HomeDayWindow): string {
  const [year, month, date] = day.localDateKey.split('-').map(Number)
  return HOME_WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()]
}
