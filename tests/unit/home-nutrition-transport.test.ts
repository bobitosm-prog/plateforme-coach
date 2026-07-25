import { describe, expect, it } from 'vitest'
import {
  classifyHomeNutritionCollectionRead,
  homeNutritionCollectionFailure,
  readHomeNutritionSummaryFromReads,
  settleHomeNutritionSummary,
  type HomeCalorieLog,
  type HomeMealCompletion,
} from '@/lib/nutrition/home-nutrition-summary'
import type { ActivePersonalMealPlanReadResult } from '@/lib/nutrition/personal-meal-plan-reader'

const absentPlan = { status: 'absent' } as const
const emptyTracking = classifyHomeNutritionCollectionRead<HomeMealCompletion>(
  'meal_tracking',
  [],
  null,
)
const emptyLogs = classifyHomeNutritionCollectionRead<HomeCalorieLog>(
  'daily_food_logs',
  [],
  null,
)

describe('Home nutrition transport boundary', () => {
  it('distinguishes a daily_food_logs error from an empty successful collection', () => {
    const failedLogs = classifyHomeNutritionCollectionRead<HomeCalorieLog>(
      'daily_food_logs',
      null,
      { code: 'PGRST000' },
    )
    expect(readHomeNutritionSummaryFromReads(
      absentPlan,
      emptyTracking,
      failedLogs,
      'lundi',
    )).toEqual({
      status: 'failure',
      error: {
        code: 'home_nutrition_transport_failure',
        sources: ['daily_food_logs'],
      },
    })
  })

  it('distinguishes a meal_tracking error from an empty successful collection', () => {
    const failedTracking = classifyHomeNutritionCollectionRead<HomeMealCompletion>(
      'meal_tracking',
      null,
      { code: '42501' },
    )
    expect(readHomeNutritionSummaryFromReads(
      absentPlan,
      failedTracking,
      emptyLogs,
      'lundi',
    )).toEqual({
      status: 'failure',
      error: {
        code: 'home_nutrition_transport_failure',
        sources: ['meal_tracking'],
      },
    })
  })

  it('reports both sources when both reads fail', () => {
    expect(readHomeNutritionSummaryFromReads(
      absentPlan,
      homeNutritionCollectionFailure<HomeMealCompletion>('meal_tracking'),
      homeNutritionCollectionFailure<HomeCalorieLog>('daily_food_logs'),
      'lundi',
    )).toEqual({
      status: 'failure',
      error: {
        code: 'home_nutrition_transport_failure',
        sources: ['meal_tracking', 'daily_food_logs'],
      },
    })
  })

  it('keeps a confirmed pair of empty collections as real absence', () => {
    expect(readHomeNutritionSummaryFromReads(
      absentPlan,
      emptyTracking,
      emptyLogs,
      'lundi',
    )).toEqual({ status: 'absent', consumedKcal: 0 })
  })

  it('keeps the first-load value and a visible value on transport failure', () => {
    const failure = readHomeNutritionSummaryFromReads(
      absentPlan,
      emptyTracking,
      homeNutritionCollectionFailure<HomeCalorieLog>('daily_food_logs'),
      'lundi',
    )
    expect(settleHomeNutritionSummary(0, failure, true)).toBe(0)
    expect(settleHomeNutritionSummary(1810, failure, true)).toBe(1810)
  })

  it('ignores an obsolete successful response', () => {
    const obsolete = readHomeNutritionSummaryFromReads(
      absentPlan,
      emptyTracking,
      classifyHomeNutritionCollectionRead(
        'daily_food_logs',
        [{ calories: 900 }],
        null,
      ),
      'lundi',
    )
    expect(settleHomeNutritionSummary(1810, obsolete, false)).toBe(1810)
  })

  it.each([
    ['not_found', { status: 'absent' }],
    ['conflict', { status: 'conflict', error: { code: 'document_conflict' } }],
    ['invalid', { status: 'invalid', error: { code: 'invalid_document' } }],
    ['legacy_unsupported', {
      status: 'legacy_unsupported',
      error: { code: 'unsupported_legacy' },
    }],
    ['failure', {
      status: 'failure',
      error: { code: 'repository_failure', repositoryKind: 'unavailable' },
    }],
  ] as const)('preserves the plan %s result when both collections succeeded', (
    _,
    plan,
  ) => {
    const result = readHomeNutritionSummaryFromReads(
      plan as ActivePersonalMealPlanReadResult,
      emptyTracking,
      emptyLogs,
      'lundi',
    )
    if (plan.status === 'absent') {
      expect(result).toEqual({ status: 'absent', consumedKcal: 0 })
    } else {
      expect(result).toEqual(plan)
    }
  })
})
