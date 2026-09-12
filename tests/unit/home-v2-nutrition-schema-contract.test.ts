import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveHomeNutritionRead } from '@/app/hooks/useHomeDashboardModel'
import { buildHomeViewModel } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')

describe('Home V2 nutrition schema contract', () => {
  it('uses the canonical meal tracking and personal plan columns', () => {
    expect(hook).toContain(".from('meal_tracking')")
    expect(hook).toContain(".eq('is_completed', true)")
    expect(hook).not.toContain(".eq('completed', true)")

    expect(hook).toContain(".from('meal_plans')")
    expect(hook).toContain(".select('plan:plan_data')")
    expect(hook).toContain(".eq('is_active', true)")
    expect(hook).toContain('plan.data?.plan')
    expect(hook).not.toContain(".select('plan')")
    expect(hook).not.toContain(".eq('active', true)")
    expect(hook).not.toContain('plan.data?.plan_data')
  })

  it.each(['tracking', 'plan'] as const)(
    'keeps canonical food logs when the auxiliary %s read is unavailable',
    failedSource => {
      const result = resolveHomeNutritionRead({
        tracking: failedSource === 'tracking'
          ? { data: null, error: { code: '42703' } }
          : { data: [], error: null },
        plan: failedSource === 'plan'
          ? { data: null, error: { code: 'READ_FAILED' } }
          : { data: { plan: {} }, error: null },
        foodLogs: {
          data: [{ meal_type: 'breakfast', calories: 420, protein: 31, carbs: 44, fat: 12 }],
          error: null,
        },
        dayKey: 'lundi',
      })

      expect(result).toMatchObject({
        state: 'ready',
        values: { calories: 420, protein: 31, carbs: 44, fat: 12 },
      })
      expect(result.errorCode).toBeUndefined()
    },
  )

  it('distinguishes an empty day from a canonical food-log failure', () => {
    const empty = resolveHomeNutritionRead({
      tracking: { data: [], error: null },
      plan: { data: null, error: null },
      foodLogs: { data: [], error: null },
      dayKey: 'lundi',
    })
    const failed = resolveHomeNutritionRead({
      tracking: { data: [], error: null },
      plan: { data: null, error: null },
      foodLogs: { data: null, error: { code: 'READ_FAILED' } },
      dayKey: 'lundi',
    })

    expect(empty.state).toBe('empty')
    expect(empty.errorCode).toBeUndefined()
    expect(failed.state).toBe('error')
    expect(failed.errorCode).toBe('HOME_NUTRITION_READ_FAILED')
  })

  it('keeps a known empty day empty when the auxiliary plan read fails', () => {
    const result = resolveHomeNutritionRead({
      tracking: { data: [], error: null },
      plan: { data: null, error: { code: '42703' } },
      foodLogs: { data: [], error: null },
      dayKey: 'lundi',
    })

    expect(result).toMatchObject({
      state: 'empty',
      values: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      diagnosticCode: 'HOME_NUTRITION_PLAN_READ_DEGRADED',
    })
    expect(result.errorCode).toBeUndefined()
  })

  it('surfaces an unknown consumption state when tracking fails without food logs', () => {
    const result = resolveHomeNutritionRead({
      tracking: { data: null, error: { code: 'READ_FAILED' } },
      plan: { data: null, error: null },
      foodLogs: { data: [], error: null },
      dayKey: 'lundi',
    })

    expect(result.state).toBe('error')
    expect(result.errorCode).toBe('HOME_NUTRITION_READ_FAILED')
  })

  it('adds distinct tracked and logged meals without double-counting the same meal type', () => {
    const plan = {
      lundi: {
        repas: {
          petit_dejeuner: [{ kcal: 300, protein: 15, carbs: 45, fat: 7 }],
          dejeuner: [{ kcal: 600, protein: 40, carbs: 70, fat: 18 }],
        },
      },
    }
    const result = resolveHomeNutritionRead({
      tracking: { data: [{ meal_type: 'petit_dejeuner' }, { meal_type: 'dejeuner' }], error: null },
      plan: { data: { plan }, error: null },
      foodLogs: {
        data: [{ meal_type: 'breakfast', calories: 350, protein: 20, carbs: 50, fat: 9 }],
        error: null,
      },
      dayKey: 'lundi',
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
