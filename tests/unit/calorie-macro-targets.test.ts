import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_MULTIPLIERS,
  calculateAutomaticCalorieMacroTargets,
  calcMifflinStJeor,
  type AutomaticCalorieMacroTargetInput,
} from '../../lib/nutrition/calorie-macro-targets'

function legacyNutritionPreferencesCalculation(
  input: AutomaticCalorieMacroTargetInput,
) {
  const bmr = !input.weight || !input.height || !input.age
    ? 0
    : Math.round(calcMifflinStJeor(
      input.weight,
      input.height,
      input.age,
      input.gender,
    ))
  const activityMultiplier = ACTIVITY_MULTIPLIERS[
    input.activityLevel as keyof typeof ACTIVITY_MULTIPLIERS
  ] || 1.55
  const tdee = Math.round(bmr * activityMultiplier)
  const defaultAdjustment = input.objective === 'cut'
    ? -400
    : input.objective === 'bulk'
      ? 300
      : 0
  const adjustment = input.calorieAdjustment ?? defaultAdjustment
  const calorieTarget = !tdee
    ? 0
    : input.objective === 'maintain'
      ? tdee
      : tdee + adjustment

  if (!calorieTarget || !input.weight) {
    return { bmr, tdee, calorieTarget, protein: 0, carbs: 0, fat: 0 }
  }

  let proteinMultiplier = 2
  let fatPercentage = 0.3
  if (input.objective === 'cut') {
    proteinMultiplier = 2.4
    fatPercentage = 0.25
  } else if (input.objective === 'bulk') {
    proteinMultiplier = 2.2
    fatPercentage = 0.25
  }
  const protein = Math.round(proteinMultiplier * input.weight)
  const fat = Math.round((calorieTarget * fatPercentage) / 9)
  const carbs = Math.round((calorieTarget - protein * 4 - fat * 9) / 4)

  return {
    bmr,
    tdee,
    calorieTarget,
    protein,
    carbs: Math.max(carbs, 0),
    fat,
  }
}

const BASE_INPUT = {
  age: 32,
  height: 178,
  weight: 82,
} as const

describe('automatic calorie and macro target authority', () => {
  it.each([
    {
      input: { ...BASE_INPUT, gender: 'male', activityLevel: 'moderate', objective: 'cut' },
      expected: { bmr: 1778, tdee: 2756, calorieTarget: 2356, protein: 197, carbs: 246, fat: 65 },
    },
    {
      input: { ...BASE_INPUT, gender: 'female', activityLevel: 'light', objective: 'maintain' },
      expected: { bmr: 1612, tdee: 2217, calorieTarget: 2217, protein: 164, carbs: 224, fat: 74 },
    },
    {
      input: { ...BASE_INPUT, gender: 'male', activityLevel: 'moderate', objective: 'bulk' },
      expected: { bmr: 1778, tdee: 2756, calorieTarget: 3056, protein: 180, carbs: 393, fat: 85 },
    },
  ] as const)('preserves characterized $input.objective outputs', ({ input, expected }) => {
    expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(expected)
  })

  it.each([
    { gender: 'male', activityLevel: 'sedentary', objective: 'cut' },
    { gender: 'female', activityLevel: 'light', objective: 'maintain' },
    { gender: 'male', activityLevel: 'moderate', objective: 'bulk' },
    { gender: 'female', activityLevel: 'active', objective: 'cut' },
    { gender: 'male', activityLevel: 'extreme', objective: 'maintain' },
  ] as const)(
    'matches NutritionPreferences for $gender/$activityLevel/$objective',
    scenario => {
      const input = { ...BASE_INPUT, ...scenario }
      expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(
        legacyNutritionPreferencesCalculation(input),
      )
    },
  )

  it.each([
    { objective: 'cut', calorieAdjustment: -700 },
    { objective: 'cut', calorieAdjustment: -200 },
    { objective: 'bulk', calorieAdjustment: 150 },
    { objective: 'bulk', calorieAdjustment: 500 },
  ] as const)('preserves the $objective slider adjustment $calorieAdjustment', scenario => {
    const input = {
      ...BASE_INPUT,
      gender: 'male',
      activityLevel: 'moderate',
      ...scenario,
    }
    expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(
      legacyNutritionPreferencesCalculation(input),
    )
  })

  it('ignores an adjustment for maintenance as before', () => {
    const input = {
      ...BASE_INPUT,
      gender: 'female',
      activityLevel: 'moderate',
      objective: 'maintain',
      calorieAdjustment: 500,
    } as const
    const result = calculateAutomaticCalorieMacroTargets(input)

    expect(result.calorieTarget).toBe(result.tdee)
    expect(result).toEqual(legacyNutritionPreferencesCalculation(input))
  })

  it('keeps the moderate fallback for an unknown activity level', () => {
    const input = {
      ...BASE_INPUT,
      gender: 'male',
      activityLevel: 'legacy_unknown',
      objective: 'maintain',
    } as const

    expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(
      legacyNutritionPreferencesCalculation(input),
    )
  })

  it.each([
    { weight: 0, height: 178, age: 32 },
    { weight: 82, height: 0, age: 32 },
    { weight: 82, height: 178, age: 0 },
  ])('keeps zero targets for incomplete body data: %o', bodyData => {
    const input = {
      ...bodyData,
      gender: 'male',
      activityLevel: 'moderate',
      objective: 'cut',
    } as const

    expect(calculateAutomaticCalorieMacroTargets(input)).toEqual(
      legacyNutritionPreferencesCalculation(input),
    )
  })

  it('makes NutritionPreferences consume the shared authority without a local formula', () => {
    const source = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')

    expect(source).toContain('calculateAutomaticCalorieMacroTargets({')
    expect(source).not.toContain('calcMifflinStJeor(weight')
    expect(source).not.toContain('protMultiplier')
    expect(source).not.toContain('fatPct')
  })
})
