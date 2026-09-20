import { describe, expect, it } from 'vitest'
import { adjustTrainingSets, countPlannedSessions, prepareWeeklyAdjustment } from '@/lib/weekly-diagnostic/adjustments'
import { calculateMacroTargetsForCalories } from '@/lib/nutrition/calorie-macro-targets'
import { DAYS, parseMealPlan, computeDayTotals } from '@/lib/meal-plan'
import { getNutritionPlanConsistency } from '@/lib/nutrition/plan-context'
import { weeklyFixture } from '../fixtures/weekly-adjustment'

describe('measured weekly training adjustments', () => {
  it.each([-20, -10, 10, 20])('adapts %s%% relative to the actual existing sets without changing exercises', delta => {
    const { program } = weeklyFixture()
    const before = structuredClone(program.days)
    const adjusted = adjustTrainingSets(program.days, delta)
    expect(adjusted.before).toBe(15)
    expect(Math.abs(adjusted.actualPct)).toBeLessThanOrEqual(20)
    expect(Math.sign(adjusted.after - adjusted.before)).toBe(Math.sign(delta))
    expect(program.days).toEqual(before)
    adjusted.days.forEach((day, index) => {
      expect(day.is_rest).toBe(before[index].is_rest)
      day.exercises?.forEach((exercise, i) => {
        expect({ ...exercise, sets: 0 }).toEqual({ ...before[index].exercises[i], sets: 0 })
        expect(Number(exercise.sets)).toBeGreaterThanOrEqual(1)
      })
    })
    expect(countPlannedSessions(adjusted.days)).toBe(3)
  })
  it('displays rounding honestly: 15 sets +10% becomes 17, i.e. +13.3%', () => {
    expect(adjustTrainingSets(weeklyFixture().program.days, 10)).toMatchObject({ before: 15, after: 17, actualPct: 13.3 })
  })
  it.each([0, 21, -21, NaN, Infinity])('rejects invalid delta %s', delta => {
    expect(() => adjustTrainingSets(weeklyFixture().program.days, delta)).toThrow()
  })
  it('refuses unsupported phased plans and ambiguous set ranges', () => {
    const f = weeklyFixture()
    expect(() => prepareWeeklyAdjustment(f.profile, { ...f.program, phases: [{}] }, f.mealPlan, { training_volume_delta_pct: 10 })).toThrow()
    const days = structuredClone(f.program.days) as unknown as Record<string, unknown>[]
    days[0].exercises = [{ name: 'Squat', sets: '3-5' }]
    expect(() => adjustTrainingSets(days, 10)).toThrow()
  })
})
describe('portion-only weekly nutrition adaptation', () => {
  const macro = calculateMacroTargetsForCalories({ targetCalories: 2100, weightKg: 80, objective: 'cut', dietaryType: 'omnivore' })
  const adj = { calorie_goal_new: 2100, protein_goal_new: macro.proteinGrams, carbs_goal_new: macro.carbsGrams, fat_goal_new: macro.fatGrams }
  it('revalidates seven days, preserves foods and aligns plan and targets', () => {
    const f = weeklyFixture()
    const result = prepareWeeklyAdjustment(f.profile, f.program, f.mealPlan, adj)
    expect(result.domain).toBe('nutrition')
    const before = parseMealPlan(f.mealPlan.plan_data), after = parseMealPlan(result.plan)
    for (const day of DAYS) {
      expect(after[day]!.meals.map(m => m.foods.map(food => food.name))).toEqual(before[day]!.meals.map(m => m.foods.map(food => food.name)))
      expect(Math.abs(computeDayTotals(after[day]!).kcal - 2100)).toBeLessThanOrEqual(168)
    }
    expect(getNutritionPlanConsistency(result.plan, { ...f.profile, calorie_goal: 2100, protein_goal: macro.proteinGrams, carbs_goal: macro.carbsGrams, fat_goal: macro.fatGrams })).toBe('aligned')
  })
  it('rejects a stale plan rather than silently rewriting changed preferences', () => {
    const f = weeklyFixture()
    expect(() => prepareWeeklyAdjustment({ ...f.profile, allergies: ['tree_nuts'] }, f.program, f.mealPlan, adj)).toThrow('plan_outdated')
  })
  it('rejects mixed domains and excessive calorie changes', () => {
    const f = weeklyFixture()
    expect(() => prepareWeeklyAdjustment(f.profile, f.program, f.mealPlan, { ...adj, training_volume_delta_pct: 10 })).toThrow()
    expect(() => prepareWeeklyAdjustment(f.profile, f.program, f.mealPlan, { ...adj, calorie_goal_new: 1800 })).toThrow()
  })
})
