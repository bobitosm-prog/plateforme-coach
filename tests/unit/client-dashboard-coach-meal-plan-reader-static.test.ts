import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const boundary = readFileSync('lib/client-dashboard/coach-meal-plan-reader.ts', 'utf8')
const loader = readFileSync('lib/client-dashboard/nutrition-measurements-loader.ts', 'utf8')

describe('isolated coach meal-plan reader wiring', () => {
  it('routes the selected consumer through the common row reader', () => {
    expect(boundary).toContain('readClientMealPlanRow')
    expect(loader).toContain('readLatestCoachMealPlan(mealPlan)')
    expect(loader).toContain("COACH_MEAL_PLAN_PROJECTION = 'plan'")
  })

  it('does not read aliases or add unsafe fallbacks in the selected consumer', () => {
    expect(loader).not.toMatch(/plan_data|is_active|plan\s*\\?\\?\s*plan_data|active\s*\\?\\?\s*is_active/)
    expect(boundary).not.toMatch(/plan_data|is_active|plan\s*\\?\\?\s*plan_data|active\s*\\?\\?\s*is_active/)
    expect(boundary).not.toMatch(/(?:kcal|protein|carbs|fat|fiber)[^\n]*\|\|\s*0/)
  })

  it('keeps the query bounded and unchanged', () => {
    expect(loader).toContain(".eq('client_id', clientUserId).order('created_at', { ascending: false }).limit(1).maybeSingle()")
    expect(loader).not.toMatch(/select\(['"]\*['"]|createClient|service_role/)
  })

  it('contains no Nutrition write and leaves other consumers unmigrated', () => {
    expect(`${boundary}\n${loader}`).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
    const allApplicationConsumers = [
      'app/hooks/nutrition/useNutritionPlans.ts',
      'app/components/tabs/NutritionTab.tsx',
      'app/components/tabs/HomeTab.tsx',
      'lib/coaching/client-detail/nutrition.ts',
    ].map(file => readFileSync(file, 'utf8')).join('\n')
    expect(allApplicationConsumers).not.toMatch(/nutrition\/plan-envelope|readMealPlanRow|readClientMealPlanRow/)
  })
})
