import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const detail = readFileSync('app/(application)/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx', 'utf8')
const preferences = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
const initial = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')

describe('Athena adjustment lifecycle', () => {
  it('uses the same safe personal meal-plan replacement in every personal flow', () => {
    expect(detail).toContain('replacePersonalMealPlan(supabase, userId, planData)')
    expect(preferences).toContain('persist_generated_plan: true')
    expect(initial).toContain('replacePersonalMealPlan(supabase, userId, payload)')
  })

  it('does not mark a weekly adjustment applied before required plans exist', () => {
    const mealRegen = detail.indexOf('if (macrosChanged && !await regenMealPlan(updates))')
    const trainingRegen = detail.indexOf('if (volumeChanged && !await regenProgram(volumeDeltaPct))')
    const profileUpdate = detail.indexOf('await updateProfile(userId, updates, supabase)', mealRegen)
    const appliedUpdate = detail.indexOf(".from('weekly_diagnostics')", profileUpdate)
    const appliedState = detail.indexOf('setApplied(true)', appliedUpdate)

    expect(mealRegen).toBeGreaterThan(-1)
    expect(trainingRegen).toBeGreaterThan(mealRegen)
    expect(profileUpdate).toBeGreaterThan(trainingRegen)
    expect(appliedUpdate).toBeGreaterThan(profileUpdate)
    expect(appliedState).toBeGreaterThan(appliedUpdate)
    expect(detail).not.toContain(';(async () =>')
  })
})
