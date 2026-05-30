/**
 * Build the POST body for /api/generate-meal-plan from a profile.
 *
 * Used by:
 *   - Phase 6 F6.A.2 : auto-regénération meal plan après "Appliquer" un diagnostic
 *   - (futur) F6.A.3 : refacto NutritionPreferences pour DRY
 *
 * Handles meal_preferences key normalization:
 *   - Legacy FR keys: { petit_dejeuner, dejeuner, collation, diner }
 *   - Modern EN keys: { breakfast, lunch, snack, dinner }
 *   - API expects:    { morning, lunch, snack, dinner }
 *
 * Optional overrides allow callers to inject fresh macros (e.g. après Apply
 * d'un diagnostic) sans avoir à attendre que le profile soit re-fetched du cache.
 */
import type { Profile } from '@/lib/profile-service'

export type ObjectiveMode = 'seche' | 'maintien' | 'bulk'

export interface MacroOverrides {
  calorie_goal?: number
  protein_goal?: number
  carbs_goal?: number
  fat_goal?: number
}

export interface MealPlanParams {
  calorie_goal: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  dietary_type: string
  allergies: string[]
  disliked_foods: string[]
  objective_mode: ObjectiveMode
  caloric_adjustment: number
  tdee: number
  activity_level: string
  meal_food_names: {
    morning: string[]
    lunch: string[]
    snack: string[]
    dinner: string[]
  }
}

function mapObjectiveToMode(objective: string | null | undefined): ObjectiveMode {
  if (!objective) return 'maintien'
  const o = objective.toLowerCase().trim()
  if (o === 'cut' || o.includes('perdre') || o.includes('seche') || o.includes('sèche')) return 'seche'
  if (o === 'bulk' || o.includes('muscle') || o.includes('prendre')) return 'bulk'
  return 'maintien'
}

function extractMealFoodNames(mealPrefs: any): MealPlanParams['meal_food_names'] {
  const mp = mealPrefs && typeof mealPrefs === 'object' && !Array.isArray(mealPrefs) ? mealPrefs : {}
  return {
    morning: mp.breakfast ?? mp.petit_dejeuner ?? [],
    lunch: mp.lunch ?? mp.dejeuner ?? [],
    snack: mp.snack ?? mp.collation ?? [],
    dinner: mp.dinner ?? mp.diner ?? [],
  }
}

export function buildMealPlanParams(
  profile: Profile,
  overrides?: MacroOverrides
): MealPlanParams {
  const calorie_goal = overrides?.calorie_goal ?? profile.calorie_goal ?? 2200
  const protein_goal = overrides?.protein_goal ?? profile.protein_goal ?? 150
  const fat_goal = overrides?.fat_goal ?? profile.fat_goal ?? Math.round((calorie_goal * 0.25) / 9)
  const carbs_goal = overrides?.carbs_goal ?? profile.carbs_goal ?? Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)
  const tdee = profile.tdee ?? calorie_goal
  const caloric_adjustment = calorie_goal - tdee

  return {
    calorie_goal,
    protein_goal,
    carbs_goal,
    fat_goal,
    dietary_type: profile.dietary_type ?? 'omnivore',
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    disliked_foods: Array.isArray((profile.meal_preferences as any)?.disliked_foods)
      ? (profile.meal_preferences as any).disliked_foods
      : [],
    objective_mode: mapObjectiveToMode(profile.objective),
    caloric_adjustment,
    tdee,
    activity_level: profile.activity_level ?? 'moderate',
    meal_food_names: extractMealFoodNames(profile.meal_preferences),
  }
}
