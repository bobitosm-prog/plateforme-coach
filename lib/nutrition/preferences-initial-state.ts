import type { Profile } from '@/lib/profile-service'
import { calculateAutomaticCalorieMacroTargets, DEFAULT_CALORIE_ADJUSTMENTS, normalizeNutritionObjective } from './calorie-macro-targets'

export type NutritionMacroMode = 'auto' | 'manual' | 'ratio'
export interface NutritionPreferenceSettings {
  version: 1
  macro_mode: NutritionMacroMode
  ratios: { protein: number; carbs: number; fat: number }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Restore persisted targets without silently replacing them with defaults.
 * Metadata only restores an automatic/ratio mode if it reproduces those targets.
 * Other writers may change goals without updating this optional JSON metadata.
 */
export function getNutritionPreferencesInitialState(profile: Profile, now = Date.now()) {
  const age = profile.birth_date ? Math.floor((now - new Date(profile.birth_date).getTime()) / 31557600000) : 0
  const objective = normalizeNutritionObjective(profile.objective)
  const input = {
    gender: profile.gender || 'male', age: Number.isFinite(age) && age > 0 ? age : 0,
    weightKg: profile.current_weight || 0, heightCm: profile.height || 0,
    activityLevel: profile.activity_level || 'moderate', objective, dietaryType: profile.dietary_type,
  }
  const baseline = calculateAutomaticCalorieMacroTargets({ ...input, calorieAdjustment: 0 })
  const adjustment = nonnegative(profile.calorie_goal) && profile.calorie_goal > 0 && baseline.tdee > 0
    ? profile.calorie_goal - baseline.tdee
    : DEFAULT_CALORIE_ADJUSTMENTS[objective]
  const automatic = calculateAutomaticCalorieMacroTargets({ ...input, calorieAdjustment: adjustment })
  const metadata = record(record(profile.meal_preferences).nutrition_settings)
  const savedRatios = record(metadata.ratios)
  const validRatios = metadata.version === 1
    && [savedRatios.protein, savedRatios.carbs, savedRatios.fat].every(value => nonnegative(value) && value <= 100)
    && Number(savedRatios.protein) + Number(savedRatios.carbs) + Number(savedRatios.fat) === 100
  const ratios = validRatios
    ? { protein: Number(savedRatios.protein), carbs: Number(savedRatios.carbs), fat: Number(savedRatios.fat) }
    : { protein: 30, carbs: 45, fat: 25 }
  const hasSavedMacros = [profile.protein_goal, profile.carbs_goal, profile.fat_goal].every(nonnegative)
  const manual = {
    protein: nonnegative(profile.protein_goal) ? profile.protein_goal : 150,
    carbs: nonnegative(profile.carbs_goal) ? profile.carbs_goal : 200,
    fat: nonnegative(profile.fat_goal) ? profile.fat_goal : 60,
  }
  const matchesAutomatic = manual.protein === automatic.proteinGrams
    && manual.carbs === automatic.carbsGrams && manual.fat === automatic.fatGrams
  const matchesRatio = manual.protein === Math.round(automatic.targetCalories * ratios.protein / 400)
    && manual.carbs === Math.round(automatic.targetCalories * ratios.carbs / 400)
    && manual.fat === Math.round(automatic.targetCalories * ratios.fat / 900)
  let macroMode: NutritionMacroMode = 'auto'
  if (hasSavedMacros) {
    if (metadata.version === 1 && metadata.macro_mode === 'manual') macroMode = 'manual'
    else if (metadata.version === 1 && metadata.macro_mode === 'ratio' && validRatios && matchesRatio) macroMode = 'ratio'
    else macroMode = matchesAutomatic ? 'auto' : 'manual'
  }
  return { adjustment, macroMode, manual, ratios }
}
