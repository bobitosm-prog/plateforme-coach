import { describe, expect, it } from 'vitest'
import {
  calculateAutomaticCalorieMacroTargets,
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

function legacyProductionCalculation(input: CalorieMacroTargetInput) {
  const { weightKg, heightCm, age, gender, activityLevel, objective, calorieAdjustment } = input
  if (!weightKg || !heightCm || !age) {
    return { bmr: 0, tdee: 0, targetCalories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  const bmr = Math.round(gender === 'male' ? base + 5 : base - 161)
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extreme: 1.9,
  }
  const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.55))
  if (!tdee) {
    return { bmr, tdee, targetCalories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
  }

  const targetCalories = objective === 'maintain' ? tdee : tdee + calorieAdjustment
  if (!targetCalories) {
    return { bmr, tdee, targetCalories, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }
  }

  const proteinMultiplier = objective === 'cut' ? 2.4 : objective === 'bulk' ? 2.2 : 2
  const fatPercentage = objective === 'maintain' ? 0.3 : 0.25
  const proteinGrams = Math.round(proteinMultiplier * weightKg)
  const fatGrams = Math.round((targetCalories * fatPercentage) / 9)
  const carbsGrams = Math.max(
    Math.round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4),
    0,
  )

  return { bmr, tdee, targetCalories, proteinGrams, carbsGrams, fatGrams }
}

describe('calculateAutomaticCalorieMacroTargets', () => {
  it('matches the fixed Production matrix before and after extraction', () => {
    const genders = ['male', 'historical-other-value']
    const activities = ['sedentary', 'light', 'moderate', 'active', 'extreme', 'unknown']
    const objectiveAdjustments = [
      ['cut', -400],
      ['maintain', 0],
      ['bulk', 300],
      ['cut', -550],
    ] as const

    for (const gender of genders) {
      for (const activityLevel of activities) {
        for (const [objective, calorieAdjustment] of objectiveAdjustments) {
          const input = { ...MALE_PROFILE, gender, activityLevel, objective, calorieAdjustment }
          expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(
            legacyProductionCalculation(input),
          )
        }
      }
    }
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
    ['cut', -400, { targetCalories: 2359, proteinGrams: 192, carbsGrams: 249, fatGrams: 66 }],
    ['maintain', 0, { targetCalories: 2759, proteinGrams: 160, carbsGrams: 323, fatGrams: 92 }],
    ['bulk', 300, { targetCalories: 3059, proteinGrams: 176, carbsGrams: 398, fatGrams: 85 }],
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
      proteinGrams: 192,
      carbsGrams: 223,
      fatGrams: 61,
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
