export const NUTRITION_TIME_ZONE = 'Europe/Zurich' as const

const WEEKDAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
] as const

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export interface NutritionDayWindow {
  date: Date
  timezone: typeof NUTRITION_TIME_ZONE
  localDateKey: string
  todayStart: Date
  todayEnd: Date
  dayKey: (typeof WEEKDAYS)[number]
}

export interface NutritionWeekWindow {
  weekStartKey: string
  weekEndKey: string
  weekStart: Date
  weekEnd: Date
}

const zurichDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: NUTRITION_TIME_ZONE,
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

function dateKey(year: number, month: number, day: number): string {
  return [year, month, day]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
    .join('-')
}

export function addNutritionDays(localDateKey: string, days: number): string {
  const [year, month, day] = localDateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

export function getNutritionDayWindow(now = new Date()): NutritionDayWindow {
  const parts = zonedParts(now)
  const localDateKey = dateKey(parts.year, parts.month, parts.day)
  const tomorrowKey = addNutritionDays(localDateKey, 1)
  const [tomorrowYear, tomorrowMonth, tomorrowDay] = tomorrowKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()

  return {
    date: now,
    timezone: NUTRITION_TIME_ZONE,
    localDateKey,
    todayStart: localMidnightUtc(parts.year, parts.month, parts.day),
    todayEnd: localMidnightUtc(tomorrowYear, tomorrowMonth, tomorrowDay),
    dayKey: WEEKDAYS[weekday],
  }
}

export function getNutritionDayKey(localDateKey: string): NutritionDayWindow['dayKey'] {
  const [year, month, day] = localDateKey.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

export function getNutritionWeekWindow(now = new Date()): NutritionWeekWindow {
  const day = getNutritionDayWindow(now)
  const [year, month, date] = day.localDateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const weekStartKey = addNutritionDays(day.localDateKey, mondayOffset)
  const weekEndKey = addNutritionDays(weekStartKey, 6)
  const [startYear, startMonth, startDay] = weekStartKey.split('-').map(Number)
  const afterWeekKey = addNutritionDays(weekEndKey, 1)
  const [endYear, endMonth, endDay] = afterWeekKey.split('-').map(Number)

  return {
    weekStartKey,
    weekEndKey,
    weekStart: localMidnightUtc(startYear, startMonth, startDay),
    weekEnd: localMidnightUtc(endYear, endMonth, endDay),
  }
}
