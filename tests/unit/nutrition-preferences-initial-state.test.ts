import { describe, expect, it } from 'vitest'
import { getNutritionPreferencesInitialState } from '@/lib/nutrition/preferences-initial-state'
import { calculateAutomaticCalorieMacroTargets } from '@/lib/nutrition/calorie-macro-targets'

const now = Date.parse('2026-09-19T12:00:00Z')
const profile = { id: 'synthetic', birth_date: '1996-01-01', gender: 'male', height: 180, current_weight: 80, activity_level: 'moderate', objective: 'cut' }
describe('saved nutrition preference restoration', () => {
  it('restores a custom deficit instead of resetting it to minus 400', () => {
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: 2109 }, now).adjustment).toBe(-650)
  })
  it('keeps new profiles on the automatic defaults', () => {
    expect(getNutritionPreferencesInitialState(profile, now)).toMatchObject({ adjustment: -400, macroMode: 'auto' })
  })
  it('preserves legacy custom macros rather than recalculating them on open', () => {
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: 2200, protein_goal: 150, carbs_goal: 250, fat_goal: 70 }, now))
      .toMatchObject({ adjustment: -559, macroMode: 'manual', manual: { protein: 150, carbs: 250, fat: 70 } })
  })
  it('preserves zero instead of replacing it with a default', () => {
    expect(getNutritionPreferencesInitialState({ ...profile, protein_goal: 150, carbs_goal: 0, fat_goal: 70 }, now).manual.carbs).toBe(0)
  })
  it('restores auto when saved targets match that calculation', () => {
    const result = calculateAutomaticCalorieMacroTargets({ gender: 'male', age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate', objective: 'cut', calorieAdjustment: -650 })
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: result.targetCalories, protein_goal: result.proteinGrams, carbs_goal: result.carbsGrams, fat_goal: result.fatGrams }, now).macroMode).toBe('auto')
  })
  it('restores an explicitly saved ratio mode and percentages', () => {
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: 2200, protein_goal: 138, carbs_goal: 275, fat_goal: 61,
      meal_preferences: { nutrition_settings: { version: 1, macro_mode: 'ratio', ratios: { protein: 25, carbs: 50, fat: 25 } } },
    }, now)).toMatchObject({ macroMode: 'ratio', ratios: { protein: 25, carbs: 50, fat: 25 } })
  })
  it('does not trust stale ratio metadata over actual saved targets', () => {
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: 2200, protein_goal: 150, carbs_goal: 250, fat_goal: 70,
      meal_preferences: { nutrition_settings: { version: 1, macro_mode: 'ratio', ratios: { protein: 25, carbs: 50, fat: 25 } } },
    }, now).macroMode).toBe('manual')
  })
  it.each([null, 'invalid', { version: 2 }, { version: 1, macro_mode: 'ratio', ratios: { protein: 80, carbs: 80, fat: 80 } }])('ignores malformed or unsupported metadata %j', settings => {
    expect(getNutritionPreferencesInitialState({ ...profile, calorie_goal: 2200, protein_goal: 150, carbs_goal: 250, fat_goal: 70,
      meal_preferences: { nutrition_settings: settings },
    }, now)).toMatchObject({ macroMode: 'manual', ratios: { protein: 30, carbs: 45, fat: 25 } })
  })
  it('does not overwrite saved calories when weight or age changed elsewhere', () => {
    const initial = getNutritionPreferencesInitialState({ ...profile, current_weight: 85, calorie_goal: 2200 }, now)
    const result = calculateAutomaticCalorieMacroTargets({ gender: 'male', age: 30, heightCm: 180, weightKg: 85, activityLevel: 'moderate', objective: 'cut', calorieAdjustment: initial.adjustment })
    expect(result.targetCalories).toBe(2200)
  })
})
