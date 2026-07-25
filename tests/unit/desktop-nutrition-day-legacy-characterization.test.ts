import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const desktop = fs.readFileSync(
  path.join(process.cwd(), 'app/(dashboard)/page-desktop.tsx'),
  'utf8',
)

function legacyTotals(rows: readonly Record<string, unknown>[]) {
  let calories: number | string = 0
  let proteins: number | string = 0
  let carbs: number | string = 0
  let fats: number | string = 0
  const add = (left: number | string, right: unknown): number | string =>
    typeof left === 'string' || typeof right === 'string'
      ? `${left}${right}`
      : left + (typeof right === 'number' ? right : 0)
  rows.forEach(row => {
    calories = add(calories, (row.calories as number) || 0)
    proteins = add(proteins, (row.protein as number) || 0)
    carbs = add(carbs, (row.carbs as number) || 0)
    fats = add(fats, (row.fat as number) || 0)
  })
  return { calories, proteins, carbs, fats }
}

describe('desktop nutrition day legacy characterization', () => {
  it('records the replaced wide projection while preserving the query contract', () => {
    expect(desktop).not.toContain("from('daily_food_logs').select('*')")
    expect(desktop).toContain(
      "from('daily_food_logs').select(DESKTOP_NUTRITION_DAY_PROJECTION)",
    )
    expect(desktop).toContain(
      ".eq('user_id', uid).eq('date', today).order('created_at', { ascending: true })",
    )
  })

  it('characterizes the successful empty day as four zero totals', () => {
    expect(legacyTotals([])).toEqual({
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
    })
  })

  it('characterizes nullable, absent and empty metrics as zero', () => {
    expect(legacyTotals([
      { calories: null, protein: undefined, carbs: '', fat: 0 },
    ])).toEqual({
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
    })
  })

  it('characterizes numeric strings, NaN, Infinity and negatives', () => {
    expect(legacyTotals([
      { calories: '120', protein: Number.NaN, carbs: Number.POSITIVE_INFINITY, fat: -2 },
    ])).toEqual({
      calories: '0120',
      proteins: 0,
      carbs: Number.POSITIVE_INFINITY,
      fats: -2,
    })
  })

  it('records the replaced implicit error handling', () => {
    expect(desktop).not.toMatch(
      /select\(DESKTOP_NUTRITION_DAY_PROJECTION\)[\s\S]{0,500}if \(!data\) return/,
    )
    expect(desktop).toContain('readDesktopNutritionDayResponse(data, error, uid, today)')
    expect(desktop).toContain('desktopNutritionRequest')
  })
})
