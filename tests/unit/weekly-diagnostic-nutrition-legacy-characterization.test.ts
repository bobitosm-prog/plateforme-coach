import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const generator = readFileSync('lib/weekly-diagnostic/generator.ts', 'utf8')
const nutritionRead = generator.slice(
  generator.indexOf("supabase.from('daily_food_logs')"),
  generator.indexOf("supabase.from('weight_logs')"),
)

describe('weekly diagnostic legacy Nutrition aggregation characterization', () => {
  it('keeps one owner-scoped, half-open, collection read without order or limit', () => {
    expect(generator.match(/from\('daily_food_logs'\)/g)).toHaveLength(1)
    expect(nutritionRead).toContain(".select('date, calories, protein, carbs, fat')")
    expect(nutritionRead).toContain(".eq('user_id', userId)")
    expect(nutritionRead).toContain(".gte('date', weekStartStr)")
    expect(nutritionRead).toContain(".lt('date', weekEndStr)")
    expect(nutritionRead).not.toMatch(/\.order\(|\.limit\(|\.single\(|\.maybeSingle\(/)
  })

  it('delegates validation without retaining legacy false-zero conversions', () => {
    expect(generator).toContain('aggregateWeeklyDiagnosticNutrition(foodLogsRes.data ?? [], week)')
    expect(generator).not.toMatch(/Number\(log\.(?:calories|protein)\s*\|\|\s*0\)/)
    expect(generator).not.toMatch(/daysLogged\s*>\s*0\s*\?[^:]+:\s*0/)
  })

  it('does not consume carbs, fat, meal type, quantity or portions', () => {
    const aggregation = generator.slice(
      generator.indexOf('const nutrition ='),
      generator.indexOf('// 6. COHERENCE FLAGS'),
    )
    expect(aggregation).not.toMatch(/log\.(?:carbs|fat|meal_type|quantity_g|portion)/)
  })
})
