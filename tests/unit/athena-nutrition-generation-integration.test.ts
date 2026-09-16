import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const route = readFileSync('app/api/generate-meal-plan/route.ts', 'utf8')
const onboarding = readFileSync('app/(application)/onboarding-photo/OnboardingPhotoContent.tsx', 'utf8')

describe('Athena nutrition generation integration', () => {
  it('injects the versioned scientific policy and validates every day', () => {
    expect(route).toContain('buildAthenaScientificPolicyPrompt()')
    expect(route).toContain('validateAthenaNutritionDay')
    expect(route.indexOf('fitAthenaNutritionDayToTargets(parsed')).toBeLessThan(route.indexOf('validateAthenaNutritionDay(fitted'))
  })
  it('does not derive nutrition from a body photo', () => {
    expect(route).not.toContain('ai_photo_analysis')
    expect(onboarding).not.toContain('params.ai_photo_analysis')
  })
  it('fails closed instead of returning empty successful days', () => {
    expect(route).not.toContain("plan[day] = { meals: [], totals:")
    expect(route).toContain("type: 'error'")
  })
  it('does not expose provider or internal error details', () => {
    expect(route).not.toContain('detail: message')
    expect(route).not.toContain('error: e.message')
  })
  it('retries one rejected day once, then fails closed', () => {
    expect(route).toContain('attempt <= 2')
    expect(route).toContain('attempt === 2')
    expect(route).toContain('generationFailureCode(error)')
    expect(route).toContain("type: 'error'")
  })
  it('bounds provider concurrency instead of generating seven days sequentially', () => {
    expect(route).toContain('const GENERATION_CONCURRENCY = 3')
    expect(route).toContain('mapWithConcurrency(DAYS, GENERATION_CONCURRENCY')
    expect(route).not.toContain('for (let i = 0; i < DAYS.length; i++)')
  })
  it('reserves enough output tokens for four complete structured meals', () => {
    expect(route).toContain('max_tokens: 2500')
    expect(route).not.toContain('max_tokens: 1500')
  })
  it('supports the canonical Mediterranean dietary identifier', () => {
    expect(route).toContain("diet === 'mediterranean'")
    expect(route).toContain("value === 'mediterraneen' ? 'mediterranean'")
  })
  it('only sends server-canonical food preferences to the model', () => {
    expect(route).toContain('resolveFitnessFood(name)?.name')
    expect(route).not.toContain('f.calories}kcal')
    expect(route).not.toContain('f.kcal}kcal')
    expect(route).not.toContain('Aliments prioritaires du client : ${params.scanned_foods')
  })
  it('uses the reference database raw or cooked state for animal foods', () => {
    expect(route).toContain("respecte strictement l'état cru ou cuit indiqué dans le nom de la base")
    expect(route).not.toContain('Les viandes, poissons, œufs : poids cuit également')
  })
  it('persists account regenerations before emitting the terminal event', () => {
    expect(route).toContain('if (params.persist_generated_plan)')
    expect(route.indexOf('replacePersonalMealPlan(supabaseAuth')).toBeLessThan(route.indexOf("type: 'done'"))
    expect(route).toContain('[meal-plan] generation persisted days=7')
  })
})
