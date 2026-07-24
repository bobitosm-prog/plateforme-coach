import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('app/components/tabs/HomeTab.tsx', 'utf8')

describe('HomeTab personal plan read boundary', () => {
  it('uses one common personal-plan read and no legacy SQL aliases', () => {
    expect(home).toContain('createActivePersonalMealPlanReader(')
    expect(home).toContain('createNutritionPlanRepository(supabase)')
    expect(home.match(/personalPlanReader\.load\(uid\)/g)).toHaveLength(1)
    expect(home).not.toContain("from('meal_plans')")
    expect(home).not.toMatch(/select\([^)]*(?:plan_data|is_active)/)
    expect(home).not.toMatch(/plan\s*\?\?\s*plan_data|active\s*\?\?\s*is_active/)
  })

  it('preserves exactly the three parallel summary reads and their bounds', () => {
    expect(home).toContain("from('meal_tracking').select('meal_type')")
    expect(home).toContain(".eq('is_completed', true).limit(20)")
    expect(home).toContain('personalPlanReader.load(uid)')
    expect(home).toContain("from('daily_food_logs').select('calories')")
    expect(home).toContain(".eq('date', todayDate).limit(20)")
  })

  it('rejects stale responses and keeps the historical Home refresh trigger', () => {
    expect(home).toContain('const currentRequest = ++homeNutritionRequest.current')
    expect(home).toContain('if (currentRequest !== homeNutritionRequest.current) return')
    expect(home).toContain('return () => { homeNutritionRequest.current += 1 }')
    expect(home).toContain('[homeRefreshKey, personalPlanReader, session?.user?.id, supabase]')
  })

  it('does not add a Nutrition mutation or alter the Home rendering contracts', () => {
    expect(home).not.toMatch(/from\(['"]meal_plans['"]\)[\s\S]*(?:insert|update|upsert|delete)/)
    for (const component of [
      'HomeHeader',
      'HeroSessionCard',
      'EnergyCard',
      'RecoveryCard',
      'NutritionCard',
      'WeeklyDiagnosticCard',
    ]) {
      expect(home).toContain(`<${component}`)
    }
    expect(home).toContain(
      '<EnergyCard consumedKcal={consumedKcal} calorieGoal={calorieGoal}',
    )
    expect(home).toContain(
      '<NutritionCard consumedKcal={consumedKcal} calorieGoal={calorieGoal}',
    )
  })
})
