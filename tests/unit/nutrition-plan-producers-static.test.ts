import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const types = readFileSync('lib/supabase/database.types.ts', 'utf8')
const repositories = readFileSync('lib/repositories/nutrition/plans.ts', 'utf8')
const preferences = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
const initial = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')
const diagnostic = readFileSync('app/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx', 'utf8')
const coachAi = readFileSync('app/client/[id]/hooks/useClientDetailAi.ts', 'utf8')
const coachController = readFileSync('app/client/[id]/hooks/useClientDetailController.ts', 'utf8')
const onboardingPhoto = readFileSync('app/onboarding-photo/OnboardingPhotoContent.tsx', 'utf8')
const absCalculator = readFileSync('app/components/progress/AbsCalculator.tsx', 'utf8')

function tableBlock(table: string, nextTable: string): string {
  return types.slice(types.indexOf(`      ${table}: {`), types.indexOf(`      ${nextTable}: {`))
}

describe('Nutrition plan generated contracts', () => {
  it('keeps meal_plans limited to plan/active in generated types and repositories', () => {
    const block = tableBlock('meal_plans', 'meal_tracking')
    expect(block).toContain('plan: Json')
    expect(block).toContain('active: boolean | null')
    expect(block).not.toMatch(/plan_data|is_active|total_calories|protein_g|carbs_g|fat_g|objective/)
    expect(repositories).toContain("'id,user_id,created_by,name,plan,active,created_at'")
  })

  it('keeps client_meal_plans limited to plan and identities', () => {
    const block = tableBlock('client_meal_plans', 'client_programs')
    expect(block).toContain('client_id: string | null')
    expect(block).toContain('coach_id: string | null')
    expect(block).toContain('plan: Json')
    expect(block).not.toMatch(/week_start|calorie_target|protein_target|carb_target|fat_target/)
    expect(repositories).toContain("'id,client_id,coach_id,plan,created_at,updated_at'")
  })
})

describe('Nutrition plan runtime producer characterization', () => {
  it('finds the two minimal personal generation producers', () => {
    for (const source of [preferences, initial]) {
      expect(source).toContain("update({ is_active: false })")
      expect(source).toContain('plan_data: planData')
      expect(source).toContain('is_active: true')
    }
  })

  it('finds both personal producers with declared plan-level totals', () => {
    for (const source of [diagnostic, coachAi]) {
      expect(source).toContain('total_calories:')
      expect(source).toContain('protein_g:')
      expect(source).toContain('carbs_g:')
      expect(source).toContain('fat_g:')
      expect(source).toContain('plan_data:')
      expect(source).toContain('is_active: true')
    }
  })

  it('finds coach manual assignment and two self-assignment producers', () => {
    expect(coachController).toContain('week_start: currentMonday()')
    expect(coachController).toContain('calorie_target: Math.round(calorieTarget)')
    expect(coachController).toContain('protein_target: Math.round(protTarget)')
    expect(coachController).toContain('carb_target: Math.round(carbTarget)')
    expect(coachController).toContain('fat_target: Math.round(fatTarget)')
    for (const source of [onboardingPhoto, absCalculator]) {
      expect(source).toContain("from('client_meal_plans').upsert")
      expect(source).toContain('{ client_id:')
      expect(source).toContain('plan, created_at:')
    }
  })

  it('does not introduce manual snapshot provenance in ambiguous producers', () => {
    for (const source of [preferences, initial, diagnostic, coachAi, coachController, onboardingPhoto, absCalculator]) {
      expect(source).not.toContain('_nutrition_snapshot')
      expect(source).not.toContain('totalProvenance')
    }
  })
})
