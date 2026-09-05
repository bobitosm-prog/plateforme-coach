export type NutritionPlanDurationWeeks = 1 | 2 | 4
export type NutritionMealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface NutritionPlanGenerationConfig {
  durationWeeks: NutritionPlanDurationWeeks
  dailyCalories: number
  macros: {
    protein: number
    carbs: number
    fat: number
  }
  mealsPerDay: number
  mealDistribution: Partial<Record<NutritionMealType, number>>
  dietType: string | null
  restrictions: string[]
  likedFoods: string[]
  dislikedFoods: string[]
  mealPreferences: Partial<Record<NutritionMealType, string[]>>
}

// This contract belongs to Account's future program-generation flow. The
// daily Nutrition model intentionally does not execute or persist it.
export interface NutritionPlanGenerationRequest {
  configuration: NutritionPlanGenerationConfig
  requestedAt: string
}
