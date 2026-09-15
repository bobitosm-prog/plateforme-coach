import { describe, expect, it } from 'vitest'
import {
  calculateMacroTargetsForCalories,
  calculateAutomaticCalorieMacroTargets,
  DEFAULT_CALORIE_ADJUSTMENTS,
  normalizeActivityLevel,
  normalizeNutritionObjective,
  type CalorieMacroTargetInput,
} from '../../lib/nutrition/calorie-macro-targets'

const MALE_PROFILE: CalorieMacroTargetInput = {
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  objective: 'maintain',
  calorieAdjustment: 0,
}

describe('calculateAutomaticCalorieMacroTargets', () => {
  it('normalizes historical objective aliases into one contract', () => {
    expect(normalizeNutritionObjective('weight_loss')).toBe('cut')
    expect(normalizeNutritionObjective('bulk')).toBe('mass')
    expect(normalizeNutritionObjective('mass')).toBe('mass')
    expect(normalizeNutritionObjective(undefined)).toBe('maintain')
  })

  it('uses one default energy adjustment for every consumer', () => {
    expect(DEFAULT_CALORIE_ADJUSTMENTS).toEqual({ cut: -400, maintain: 0, mass: 300 })
    expect(calculateAutomaticCalorieMacroTargets({ ...MALE_PROFILE, objective: 'cut', calorieAdjustment: undefined }).targetCalories).toBe(2359)
    expect(calculateAutomaticCalorieMacroTargets({ ...MALE_PROFILE, objective: 'mass', calorieAdjustment: undefined }).targetCalories).toBe(3059)
  })

  it('preserves the Production male and historical non-male BMR branches', () => {
    expect(calculateAutomaticCalorieMacroTargets(MALE_PROFILE).bmr).toBe(1780)

    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      gender: 'historical-other-value',
      age: 28,
      heightCm: 165,
      weightKg: 65,
    }).bmr).toBe(1380)
  })

  it.each([
    ['sedentary', 2136],
    ['light', 2448],
    ['moderate', 2759],
    ['active', 3071],
    ['extreme', 3382],
    ['unknown-legacy-value', 2759],
  ])('preserves the %s activity multiplier', (activityLevel, expectedTdee) => {
    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      activityLevel,
    }).tdee).toBe(expectedTdee)
  })

  it.each([
    ['Sedentaire <1x/sem', 'sedentary', 2136],
    ['Actif 1-2x/sem', 'light', 2448],
    ['Regulier 3-4x/sem', 'moderate', 2759],
    ['Avance 5x+/sem', 'active', 3071],
  ] as const)('maps the onboarding activity %s to %s', (activityLevel, canonical, expectedTdee) => {
    expect(normalizeActivityLevel(activityLevel)).toBe(canonical)
    expect(calculateAutomaticCalorieMacroTargets({ ...MALE_PROFILE, activityLevel }).tdee).toBe(expectedTdee)
  })

  it('rounds BMR before applying the activity multiplier', () => {
    const result = calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      gender: 'female',
      age: 18,
      heightCm: 141,
      weightKg: 40,
      activityLevel: 'light',
    })

    expect(result.bmr).toBe(1030)
    expect(result.tdee).toBe(1416)
    expect(result.tdee).not.toBe(1417)
  })

  it.each([
    ['cut', -400, { targetCalories: 2359, proteinGrams: 176, carbsGrams: 270, fatGrams: 64 }],
    ['maintain', 0, { targetCalories: 2759, proteinGrams: 160, carbsGrams: 368, fatGrams: 72 }],
    ['bulk', 300, { targetCalories: 3059, proteinGrams: 144, carbsGrams: 441, fatGrams: 80 }],
  ] as const)('preserves the %s automatic target', (objective, calorieAdjustment, expected) => {
    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      objective,
      calorieAdjustment,
    })).toEqual({ bmr: 1780, tdee: 2759, ...expected })
  })

  it('preserves a custom calorie adjustment', () => {
    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      objective: 'cut',
      calorieAdjustment: -550,
    })).toEqual({
      bmr: 1780,
      tdee: 2759,
      targetCalories: 2209,
      proteinGrams: 176,
      carbsGrams: 232,
      fatGrams: 64,
    })
  })

  it('returns zero macros when the calorie adjustment reaches a zero target', () => {
    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      objective: 'cut',
      calorieAdjustment: -2759,
    })).toEqual({
      bmr: 1780,
      tdee: 2759,
      targetCalories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    })
  })

  it('clamps residual carbohydrates to zero', () => {
    expect(calculateAutomaticCalorieMacroTargets({
      gender: 'female',
      age: 100,
      heightCm: 100,
      weightKg: 200,
      activityLevel: 'sedentary',
      objective: 'cut',
      calorieAdjustment: -700,
    }).carbsGrams).toBe(0)
  })

  it('recomputes a coherent macro split when calories change', () => {
    const macros = calculateMacroTargetsForCalories({
      targetCalories: 3000,
      weightKg: 80,
      objective: 'mass',
    })
    expect(macros).toEqual({ proteinGrams: 144, carbsGrams: 426, fatGrams: 80 })
    expect(macros.proteinGrams * 4 + macros.carbsGrams * 4 + macros.fatGrams * 9).toBe(3000)
  })

  it('creates a keto-compatible split without contradicting the calorie target', () => {
    const macros = calculateMacroTargetsForCalories({
      targetCalories: 2400,
      weightKg: 80,
      objective: 'maintain',
      dietaryType: 'keto',
    })
    expect(macros.carbsGrams).toBeLessThanOrEqual(50)
    expect(Math.abs(macros.proteinGrams * 4 + macros.carbsGrams * 4 + macros.fatGrams * 9 - 2400)).toBeLessThanOrEqual(4)
  })

  it.each([
    ['missing weight', { weightKg: 0 }],
    ['missing height', { heightCm: 0 }],
    ['invalid age', { age: 0 }],
  ])('returns zero targets for %s', (_label, invalidInput) => {
    expect(calculateAutomaticCalorieMacroTargets({
      ...MALE_PROFILE,
      ...invalidInput,
    })).toEqual({
      bmr: 0,
      tdee: 0,
      targetCalories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    })
  })
})
