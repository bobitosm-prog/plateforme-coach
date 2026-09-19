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
import { areCalorieMacroTargetsCoherent, calculateMacroTargetsForCalories } from '@/lib/nutrition/calorie-macro-targets'

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
  dietary_restrictions: string
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

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function mapObjectiveToMode(objective: string | null | undefined): ObjectiveMode {
  if (!objective) return 'maintien'
  const o = objective.toLowerCase().trim()
  if (o === 'cut' || o.includes('perdre') || o.includes('seche') || o.includes('sèche')) return 'seche'
  if (o === 'mass' || o === 'bulk' || o.includes('muscle') || o.includes('prendre')) return 'bulk'
  return 'maintien'
}

function extractMealFoodNames(mealPrefs: unknown): MealPlanParams['meal_food_names'] {
  const mp = asRecord(mealPrefs)
  return {
    morning: asStringArray(mp.breakfast ?? mp.petit_dejeuner),
    lunch: asStringArray(mp.lunch ?? mp.dejeuner),
    snack: asStringArray(mp.snack ?? mp.collation),
    dinner: asStringArray(mp.dinner ?? mp.diner),
  }
}

export function buildMealPlanParams(
  profile: Profile,
  overrides?: MacroOverrides
): MealPlanParams {
  const calorie_goal = overrides?.calorie_goal ?? profile.calorie_goal ?? 2200
  let protein_goal = overrides?.protein_goal ?? profile.protein_goal ?? 150
  let fat_goal = overrides?.fat_goal ?? profile.fat_goal ?? Math.round((calorie_goal * 0.25) / 9)
  let carbs_goal = overrides?.carbs_goal ?? profile.carbs_goal ?? Math.max(Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4), 0)
  const targetMismatch = !areCalorieMacroTargetsCoherent(calorie_goal, protein_goal, carbs_goal, fat_goal)
  const ketoMismatch = profile.dietary_type === 'keto' && carbs_goal > 50
  const weightKg = Number(profile.current_weight)
  if ((targetMismatch || ketoMismatch) && Number.isFinite(weightKg) && weightKg > 0) {
    const coherent = calculateMacroTargetsForCalories({
      targetCalories: calorie_goal,
      weightKg,
      objective: profile.objective ?? 'maintain',
      dietaryType: profile.dietary_type,
    })
    protein_goal = coherent.proteinGrams
    carbs_goal = coherent.carbsGrams
    fat_goal = coherent.fatGrams
  }
  const tdee = profile.tdee ?? calorie_goal
  const caloric_adjustment = calorie_goal - tdee
  const mealPreferences = asRecord(profile.meal_preferences)
  const dietaryRestrictions = typeof mealPreferences.dietary_restrictions === 'string'
    ? mealPreferences.dietary_restrictions.trim().slice(0, 500)
    : ''

  return {
    calorie_goal,
    protein_goal,
    carbs_goal,
    fat_goal,
    dietary_type: profile.dietary_type ?? 'omnivore',
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    dietary_restrictions: dietaryRestrictions,
    disliked_foods: asStringArray(mealPreferences.disliked_foods),
    objective_mode: mapObjectiveToMode(profile.objective),
    caloric_adjustment,
    tdee,
    activity_level: profile.activity_level ?? 'moderate',
    meal_food_names: extractMealFoodNames(profile.meal_preferences),
  }
}
