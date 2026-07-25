import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const desktop = fs.readFileSync(
  path.join(process.cwd(), 'app/(dashboard)/page-desktop.tsx'),
  'utf8',
)

function legacyWeek(
  rows: readonly Record<string, unknown>[] | null,
  dates: readonly string[],
) {
  const byDate: Record<string, number | string> = {}
  ;(rows || []).forEach(row => {
    const date = String(row.date)
    const previous = byDate[date] || 0
    const calories = row.calories || 0
    byDate[date] = typeof previous === 'string' || typeof calories === 'string'
      ? `${previous}${calories}`
      : Number(previous) + Number(calories)
  })
  return dates.map(date => Math.round(Number(byDate[date] || 0)))
}

const dates = [
  '2026-07-19',
  '2026-07-20',
  '2026-07-21',
  '2026-07-22',
  '2026-07-23',
  '2026-07-24',
  '2026-07-25',
]

describe('desktop nutrition week legacy characterization', () => {
  it('records the replaced projection while preserving the query and refresh contracts', () => {
    expect(desktop).not.toContain(
      "from('daily_food_logs').select('date, calories').eq('user_id', uid).gte('date', startDate).order('date')",
    )
    expect(desktop).toContain(
      "from('daily_food_logs').select(DESKTOP_NUTRITION_WEEK_PROJECTION).eq('user_id', uid).gte('date', startDate).order('date')",
    )
    expect(desktop).toContain(
      '}, [session?.user?.id, todayFoodLogs])',
    )
  })

  it('characterizes a missing or empty period as seven zeros', () => {
    expect(legacyWeek(null, dates)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(legacyWeek([], dates)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('characterizes absent days, null, absent fields and NaN as zeros', () => {
    expect(legacyWeek([
      { date: dates[0], calories: null },
      { date: dates[1] },
      { date: dates[2], calories: Number.NaN },
    ], dates)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('characterizes strings, infinity and negative values', () => {
    expect(legacyWeek([
      { date: dates[0], calories: '120' },
      { date: dates[1], calories: Number.POSITIVE_INFINITY },
      { date: dates[2], calories: -10 },
    ], dates)).toEqual([120, Number.POSITIVE_INFINITY, -10, 0, 0, 0, 0])
  })

  it('characterizes multiple values and the implicit error fallback', () => {
    expect(legacyWeek([
      { date: dates[6], calories: 100.4 },
      { date: dates[6], calories: 200.4 },
    ], dates)).toEqual([0, 0, 0, 0, 0, 0, 301])
    expect(desktop).not.toContain(';(data || []).forEach')
    expect(desktop).toContain('desktopNutritionWeekRequest')
  })
})
