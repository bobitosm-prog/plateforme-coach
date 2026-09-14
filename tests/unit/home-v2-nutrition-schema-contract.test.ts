import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveHomeNutritionRead } from '@/app/hooks/useHomeDashboardModel'
import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')
const personalPlanRepository = readFileSync('lib/meal-plan/personal-plan-repository.ts', 'utf8')

describe('Home V2 nutrition schema contract', () => {
  it('uses daily food logs and the shared personal-plan compatibility repository', () => {
    expect(hook).toContain(".from('daily_food_logs')")
    expect(hook).not.toContain(".from('meal_tracking')")
    expect(hook).toContain('readActivePersonalMealPlan(supabase, userId)')
    expect(personalPlanRepository).toContain('plan:plan_data,active:is_active')
    expect(hook).toContain('plan.data?.plan')
    expect(hook).not.toContain('plan.data?.plan_data')
  })

  it('keeps canonical food logs when the auxiliary plan read is unavailable', () => {
      const result = resolveHomeNutritionRead({
        plan: { data: null, error: { code: 'READ_FAILED' } },
        foodLogs: {
          data: [{ meal_type: 'breakfast', calories: 420, protein: 31, carbs: 44, fat: 12 }],
          error: null,
        },
      })

      expect(result).toMatchObject({
        state: 'ready',
        values: { calories: 420, protein: 31, carbs: 44, fat: 12 },
      })
      expect(result.errorCode).toBeUndefined()
  })

  it('distinguishes an empty day from a canonical food-log failure', () => {
    const empty = resolveHomeNutritionRead({
      plan: { data: null, error: null },
      foodLogs: { data: [], error: null },
    })
    const failed = resolveHomeNutritionRead({
      plan: { data: null, error: null },
      foodLogs: { data: null, error: { code: 'READ_FAILED' } },
    })

    expect(empty.state).toBe('empty')
    expect(empty.errorCode).toBeUndefined()
    expect(failed.state).toBe('error')
    expect(failed.errorCode).toBe('HOME_NUTRITION_READ_FAILED')
  })

  it('keeps a known empty day empty when the auxiliary plan read fails', () => {
    const result = resolveHomeNutritionRead({
      plan: { data: null, error: { code: '42703' } },
      foodLogs: { data: [], error: null },
    })

    expect(result).toMatchObject({
      state: 'empty',
      values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      diagnosticCode: 'HOME_NUTRITION_PLAN_READ_DEGRADED',
    })
    expect(result.errorCode).toBeUndefined()
  })

  it('does not count a planned meal as consumed food', () => {
    const result = resolveHomeNutritionRead({
      plan: {
        data: {
          plan: {
            days: [{ meals: [{ type: 'breakfast', calories: 500, protein: 30, carbs: 50, fat: 20 }] }],
          },
        },
        error: null,
      },
      foodLogs: { data: [], error: null },
    })

    expect(result.state).toBe('empty')
    expect(result.values).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 })
    expect(result.hasPersonalMealPlan).toBe(true)
  })

  it('sums only the canonical logs recorded for the selected day', () => {
    const result = resolveHomeNutritionRead({
      plan: { data: { plan: { days: [] } }, error: null },
      foodLogs: {
        data: [
          { meal_type: 'breakfast', calories: 350, protein: 20, carbs: 50, fat: 9 },
          { meal_type: 'lunch', calories: 600, protein: 40, carbs: 70, fat: 18 },
        ],
        error: null,
      },
    })

    expect(result.state).toBe('ready')
    expect(result.values).toEqual({ calories: 950, protein: 60, carbs: 120, fat: 27 })
  })

  it('keeps consumed nutrition separate from targets', () => {
    const model = buildHomeViewModel({
      today: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
      identity: { firstName: 'Test', xp: 0, streak: 0 },
      training: { state: 'empty' },
      nutrition: {
        state: 'ready',
        caloriesConsumed: 840,
        caloriesTarget: 2_200,
        macrosConsumed: { protein: 64, carbs: 92, fat: 25 },
        macrosTarget: { protein: 160, carbs: 240, fat: 72 },
        hasPlan: true,
      },
      coach: { relationStatus: 'not_found' },
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
    })

    expect(model.nutrition.caloriesConsumed).toBe(840)
    expect(model.nutrition.caloriesTarget).toBe(2_200)
    expect(model.nutrition.macrosConsumed.protein).toBe(64)
    expect(model.nutrition.macrosTarget.protein).toBe(160)
  })

  it('does not represent a nutrition read error as zero consumption', () => {
    const model = buildHomeViewModel({
      today: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
      identity: { firstName: 'Test', xp: 0, streak: 0 },
      training: { state: 'empty' },
      nutrition: {
        caloriesConsumed: 0,
        caloriesTarget: 2_200,
        hasPlan: true,
      },
      coach: { relationStatus: 'not_found' },
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
      errors: { nutrition: 'HOME_NUTRITION_READ_FAILED' },
    })

    expect(model.nutrition.state).toBe('error')
    expect(model.nutrition.caloriesConsumed).toBeNull()
  })
})
