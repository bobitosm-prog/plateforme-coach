import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync('app/hooks/nutrition/useNutritionPlans.ts', 'utf8')
const repository = readFileSync('lib/repositories/nutrition/plans.ts', 'utf8')
const nutritionTab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')

describe('personal nutrition plan consumer boundary', () => {
  it('uses the common bounded owner-scoped reader with canonical SQL columns', () => {
    expect(hook).toContain('createActivePersonalMealPlanReader(')
    expect(hook).toContain('personalPlanReader.load(userId)')
    expect(hook).not.toContain("from('meal_plans')")
    expect(hook).not.toMatch(/plan_data|is_active/)
    expect(repository).toContain(
      "PERSONAL_MEAL_PLAN_PROJECTION = 'id,user_id,created_by,name,plan,active,created_at'",
    )
    expect(repository).toContain(".eq('user_id', ownerUserId).eq('active', true)")
    expect(repository).toContain(".order('created_at', { ascending: false }).limit(1).maybeSingle()")
    expect(repository).not.toMatch(/select\(['"]\*['"]/)
  })

  it('preserves owner-scoped retry and stale-response cancellation', () => {
    expect(hook).toContain('const current = ++requestId.current')
    expect(hook).toContain('if (current !== requestId.current) return')
    expect(hook).toContain('requestId.current += 1')
    expect(hook).toContain('retry: reload')
    expect(hook).toContain('[date, personalPlanReader, supabase, userId]')
  })

  it('preserves personal-before-coach UI priority', () => {
    const personal = nutritionTab.indexOf('if (activeMealPlan?.plan_data)')
    const coach = nutritionTab.indexOf('if (coachMealPlan)', personal)
    expect(personal).toBeGreaterThan(-1)
    expect(coach).toBeGreaterThan(personal)
  })

  it('keeps the existing completion mutation and adds no Nutrition write', () => {
    expect(hook.match(/\.upsert\(/g)).toHaveLength(1)
    expect(hook).toContain("supabase.from('meal_tracking').upsert({")
    expect(hook).toContain('user_id: userId, meal_plan_id: planId, date, meal_type: mealType,')
    expect(hook).toContain("}, { onConflict: 'user_id,date,meal_type' })")
    expect(hook).not.toMatch(/from\(['"]meal_plans['"]\)[\s\S]*(?:insert|update|upsert|delete)/)
  })

  it('migrates exactly one personal runtime consumer', () => {
    const files = [
      'app/hooks/nutrition/useNutritionPlans.ts',
      'app/components/tabs/HomeTab.tsx',
      'lib/coaching/client-detail/nutrition.ts',
    ]
    const migrated = files.filter(file =>
      readFileSync(file, 'utf8').includes('personal-meal-plan-reader'))
    expect(migrated).toEqual(['app/hooks/nutrition/useNutritionPlans.ts'])
  })
})
