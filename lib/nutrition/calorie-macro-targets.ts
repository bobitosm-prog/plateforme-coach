export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extreme: 1.9,
} as const

export type CalorieMacroObjective = 'cut' | 'maintain' | 'bulk'

export interface AutomaticCalorieMacroTargetInput {
  readonly gender: string
  readonly age: number
  readonly height: number
  readonly weight: number
  readonly activityLevel: string
  readonly objective: CalorieMacroObjective
  readonly calorieAdjustment?: number
}

export interface AutomaticCalorieMacroTargets {
  readonly bmr: number
  readonly tdee: number
  readonly calorieTarget: number
  readonly protein: number
  readonly carbs: number
  readonly fat: number
}

const DEFAULT_CALORIE_ADJUSTMENTS: Record<CalorieMacroObjective, number> = {
  cut: -400,
  maintain: 0,
  bulk: 300,
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

function resolveActivityMultiplier(activityLevel: string): number {
  return ACTIVITY_MULTIPLIERS[
    activityLevel as keyof typeof ACTIVITY_MULTIPLIERS
  ] ?? ACTIVITY_MULTIPLIERS.moderate
}

export function calculateAutomaticCalorieMacroTargets(
  input: AutomaticCalorieMacroTargetInput,
): AutomaticCalorieMacroTargets {
  const { age, height, weight, gender, activityLevel, objective } = input
  const bmr = weight && height && age
    ? Math.round(calcMifflinStJeor(weight, height, age, gender))
    : 0
  const tdee = Math.round(bmr * resolveActivityMultiplier(activityLevel))
  const adjustment = input.calorieAdjustment
    ?? DEFAULT_CALORIE_ADJUSTMENTS[objective]
  const calorieTarget = !tdee
    ? 0
    : objective === 'maintain'
      ? tdee
      : tdee + adjustment

  if (!calorieTarget || !weight) {
    return { bmr, tdee, calorieTarget, protein: 0, carbs: 0, fat: 0 }
  }

  let proteinMultiplier = 2
  let fatPercentage = 0.3
  if (objective === 'cut') {
    proteinMultiplier = 2.4
    fatPercentage = 0.25
  } else if (objective === 'bulk') {
    proteinMultiplier = 2.2
    fatPercentage = 0.25
  }

  const protein = Math.round(proteinMultiplier * weight)
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
