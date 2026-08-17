export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extreme: 1.9,
} as const

export type AutomaticNutritionObjective = 'cut' | 'maintain' | 'bulk'

export interface CalorieMacroTargetInput {
  gender: string
  age: number
  heightCm: number
  weightKg: number
  activityLevel: string
  objective: AutomaticNutritionObjective
  calorieAdjustment: number
}

export interface CalorieMacroTargets {
  bmr: number
  tdee: number
  targetCalories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

const ZERO_TARGETS: CalorieMacroTargets = {
  bmr: 0,
  tdee: 0,
  targetCalories: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
}

export function calcMifflinStJeor(
  weight: number,
  height: number,
  age: number,
  gender: string,
): number {
  const base = 10 * weight + 6.25 * height - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

export function calculateAutomaticCalorieMacroTargets({
  gender,
  age,
  heightCm,
  weightKg,
  activityLevel,
  objective,
  calorieAdjustment,
}: CalorieMacroTargetInput): CalorieMacroTargets {
  if (!weightKg || !heightCm || !age) return { ...ZERO_TARGETS }

  // NutritionPreferences historically rounds BMR before applying activity.
  const bmr = Math.round(calcMifflinStJeor(weightKg, heightCm, age, gender))
  const activityMultiplier = ACTIVITY_MULTIPLIERS[
    activityLevel as keyof typeof ACTIVITY_MULTIPLIERS
  ] ?? ACTIVITY_MULTIPLIERS.moderate
  const tdee = Math.round(bmr * activityMultiplier)
  if (!tdee) return { ...ZERO_TARGETS, bmr, tdee }

  const targetCalories = objective === 'maintain' ? tdee : tdee + calorieAdjustment
  if (!targetCalories) return { ...ZERO_TARGETS, bmr, tdee, targetCalories }

  let proteinMultiplier = 2.0
  let fatPercentage = 0.3
  if (objective === 'cut') {
    proteinMultiplier = 2.4
    fatPercentage = 0.25
  } else if (objective === 'bulk') {
    proteinMultiplier = 2.2
    fatPercentage = 0.25
  }

  const proteinGrams = Math.round(proteinMultiplier * weightKg)
  const fatGrams = Math.round((targetCalories * fatPercentage) / 9)
  const carbsGrams = Math.max(
    Math.round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4),
    0,
  )

  return {
    bmr,
    tdee,
    targetCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  }
}
