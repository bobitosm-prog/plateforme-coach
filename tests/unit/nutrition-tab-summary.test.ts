import { describe, expect, it } from 'vitest'
import {
  aggregateNutritionTabConsumption,
  nutritionTabPercentage,
  nutritionTabRemaining,
  readNutritionTabSummary,
  resolveNutritionTabGoals,
} from '@/lib/nutrition/nutrition-tab-summary'

const owner = 'owner-1'
const date = '2026-07-25'
const base = {
  id: 'log-1',
  user_id: owner,
  date,
  meal_type: 'dejeuner',
  calories: 500,
  protein: 35,
  carbs: 60,
  fat: 15,
}

describe('NutritionTab C05 consumption', () => {
  it('keeps a successful empty day as four known zeros', () => {
    expect(aggregateNutritionTabConsumption([], owner, date)).toMatchObject({
      status: 'empty',
      values: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    })
  })

  it('preserves complete valid data and a real zero', () => {
    expect(aggregateNutritionTabConsumption([
      base,
      { ...base, id: 'log-2', calories: 0, protein: 5, carbs: 0, fat: 2 },
    ], owner, date)).toMatchObject({
      status: 'complete',
      values: { kcal: 500, protein: 40, carbs: 60, fat: 17 },
    })
  })

  it.each([
    ['null', null, 'unknown_metric'],
    ['undefined', undefined, 'unknown_metric'],
    ['absent', Symbol.for('absent'), 'unknown_metric'],
    ['empty string', '', 'unknown_metric'],
    ['invalid string', 'invalid', 'invalid_metric'],
    ['NaN', Number.NaN, 'invalid_metric'],
    ['Infinity', Number.POSITIVE_INFINITY, 'invalid_metric'],
    ['negative', -1, 'invalid_metric'],
  ] as const)('keeps a %s macro unavailable without hiding valid metrics', (
    _,
    protein,
    issue,
  ) => {
    const row: Record<string, unknown> = { ...base }
    if (protein === Symbol.for('absent')) delete row.protein
    else row.protein = protein
    const result = aggregateNutritionTabConsumption([row], owner, date)
    expect(result.status).toBe('partial')
    expect(result.values).toEqual({
      kcal: 500,
      protein: null,
      carbs: 60,
      fat: 15,
    })
    expect(result.issues).toContainEqual(expect.objectContaining({ code: issue }))
  })

  it('converts non-empty numeric strings without concatenation', () => {
    expect(aggregateNutritionTabConsumption([
      { ...base, calories: '120.5', protein: '15.5', carbs: '20', fat: '5' },
    ], owner, date).values).toEqual({
      kcal: 120.5,
      protein: 15.5,
      carbs: 20,
      fat: 5,
    })
  })

  it('rejects rows from another owner or selected date', () => {
    const result = aggregateNutritionTabConsumption([
      { ...base, user_id: 'owner-2' },
      { ...base, date: '2026-07-24' },
    ], owner, date)
    expect(result.status).toBe('invalid')
    expect(result.values).toEqual({
      kcal: null,
      protein: null,
      carbs: null,
      fat: null,
    })
  })
})

describe('NutritionTab C05 goals', () => {
  it('preserves present goals and explicit zeros', () => {
    expect(resolveNutritionTabGoals({
      calorie_goal: 2283,
      protein_goal: 134,
      carbs_goal: 266,
      fat_goal: 76,
    })).toMatchObject({
      status: 'complete',
      values: { kcal: 2283, protein: 134, carbs: 266, fat: 76 },
    })
    expect(resolveNutritionTabGoals({
      calorie_goal: 0,
      protein_goal: 0,
      carbs_goal: 0,
      fat_goal: 0,
    })).toMatchObject({
      status: 'complete',
      values: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    })
  })

  it.each([
    ['null', null, 'unknown_goal'],
    ['undefined', undefined, 'unknown_goal'],
    ['absent', Symbol.for('absent'), 'unknown_goal'],
    ['negative', -1, 'invalid_goal'],
    ['invalid string', 'invalid', 'invalid_goal'],
    ['Infinity', Number.POSITIVE_INFINITY, 'invalid_goal'],
  ] as const)('does not invent a fallback for a %s goal', (_, protein, issue) => {
    const profile: Record<string, unknown> = {
      calorie_goal: 2283,
      carbs_goal: 266,
      fat_goal: 76,
    }
    if (protein !== Symbol.for('absent')) profile.protein_goal = protein
    const result = resolveNutritionTabGoals(profile)
    expect(result.status).toBe('partial')
    expect(result.values).toEqual({
      kcal: 2283,
      protein: null,
      carbs: 266,
      fat: 76,
    })
    expect(result.issues).toContainEqual(expect.objectContaining({ code: issue }))
  })

  it('treats a missing profile or profile read error as unavailable goals', () => {
    expect(resolveNutritionTabGoals(null)).toMatchObject({
      status: 'unavailable',
      values: { kcal: null, protein: null, carbs: null, fat: null },
    })
  })
})

describe('NutritionTab C05 read semantics', () => {
  const profile = {
    calorie_goal: 2283,
    protein_goal: 134,
    carbs_goal: 266,
    fat_goal: 76,
  }

  it('distinguishes an empty success from a first daily-food-log error', () => {
    expect(readNutritionTabSummary({
      rows: [],
      journalState: 'empty',
      ownerUserId: owner,
      selectedDate: date,
      profile,
    }).consumption).toMatchObject({
      status: 'ready',
      value: { status: 'empty' },
    })
    expect(readNutritionTabSummary({
      rows: [],
      journalState: 'error',
      ownerUserId: owner,
      selectedDate: date,
      profile,
    }).consumption).toEqual({ status: 'failure', value: null })
  })

  it('preserves confirmed rows after an error', () => {
    expect(readNutritionTabSummary({
      rows: [base],
      journalState: 'error',
      ownerUserId: owner,
      selectedDate: date,
      profile,
    }).consumption).toMatchObject({
      status: 'failure',
      value: { values: { kcal: 500, protein: 35, carbs: 60, fat: 15 } },
    })
  })

  it('does not show rows retained from the previous selected date', () => {
    expect(readNutritionTabSummary({
      rows: [base],
      journalState: 'loading',
      ownerUserId: owner,
      selectedDate: '2026-07-26',
      profile,
    }).consumption).toEqual({ status: 'loading', value: null })
  })

  it('never computes a percentage or remaining value on an unknown basis', () => {
    expect(nutritionTabPercentage(100, null)).toBeNull()
    expect(nutritionTabPercentage(null, 2000)).toBeNull()
    expect(nutritionTabPercentage(0, 0)).toBeNull()
    expect(nutritionTabPercentage(500, 2000)).toBe(25)
    expect(nutritionTabRemaining(null, 2000)).toBeNull()
    expect(nutritionTabRemaining(1810, 2283)).toBe(473)
  })
})
