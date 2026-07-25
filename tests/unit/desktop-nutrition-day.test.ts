import { describe, expect, it } from 'vitest'
import {
  aggregateDesktopNutritionDay,
  presentDesktopNutritionMetric,
  readDesktopNutritionDayResponse,
  settleDesktopNutritionDay,
  sumDesktopNutritionMetric,
} from '@/lib/nutrition/desktop-nutrition-day'

const owner = 'owner-1'
const date = '2026-07-25'
const base = {
  id: 'log-1',
  user_id: owner,
  date,
  meal_type: 'lunch',
  custom_name: 'Repas',
  quantity_g: 100,
  created_at: '2026-07-25T12:00:00.000Z',
}

describe('desktop nutrition day aggregation', () => {
  it('keeps a successful empty day as four known zero totals', () => {
    expect(aggregateDesktopNutritionDay([], owner, date)).toEqual({
      status: 'empty',
      totals: { calories: 0, proteins: 0, carbs: 0, fats: 0 },
      rows: [],
      issues: [],
    })
  })

  it('preserves a complete valid day and multiple meals', () => {
    const result = aggregateDesktopNutritionDay([
      { ...base, calories: 500.4, protein: 30, carbs: 60, fat: 12 },
      {
        ...base,
        id: 'log-2',
        meal_type: 'dinner',
        created_at: '2026-07-25T18:00:00.000Z',
        calories: 600.4,
        protein: 40,
        carbs: 70,
        fat: 18,
      },
    ], owner, date)
    expect(result.status).toBe('complete')
    expect(result.totals).toEqual({
      calories: 1101,
      proteins: 70,
      carbs: 130,
      fats: 30,
    })
    expect(result.rows).toHaveLength(2)
  })

  it('keeps a real zero and converts non-empty numeric strings', () => {
    const result = aggregateDesktopNutritionDay([
      { ...base, calories: 0, protein: '10.5', carbs: '20', fat: 0 },
    ], owner, date)
    expect(result.status).toBe('complete')
    expect(result.totals).toEqual({
      calories: 0,
      proteins: 11,
      carbs: 20,
      fats: 0,
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['absent', Symbol.for('absent')],
    ['empty string', ''],
  ])('keeps a %s macro unknown without hiding valid metrics', (_, protein) => {
    const row: Record<string, unknown> = {
      ...base,
      calories: 450,
      carbs: 55,
      fat: 14,
    }
    if (protein !== Symbol.for('absent')) row.protein = protein
    const result = aggregateDesktopNutritionDay([row], owner, date)
    expect(result.status).toBe('partial')
    expect(result.totals).toEqual({
      calories: 450,
      proteins: null,
      carbs: 55,
      fats: 14,
    })
  })

  it.each([
    ['non-numeric string', 'invalid'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -1],
    ['incompatible type', {}],
  ])('keeps an %s macro invalid without hiding valid metrics', (_, protein) => {
    const result = aggregateDesktopNutritionDay([
      { ...base, calories: 450, protein, carbs: 55, fat: 14 },
    ], owner, date)
    expect(result.status).toBe('partial')
    expect(result.totals).toEqual({
      calories: 450,
      proteins: null,
      carbs: 55,
      fats: 14,
    })
  })

  it('excludes a wrong owner and another date without producing a false empty day', () => {
    const result = aggregateDesktopNutritionDay([
      { ...base, user_id: 'owner-2', calories: 1, protein: 1, carbs: 1, fat: 1 },
      { ...base, date: '2026-07-24', calories: 2, protein: 2, carbs: 2, fat: 2 },
    ], owner, date)
    expect(result.status).toBe('invalid')
    expect(result.totals).toEqual({
      calories: null,
      proteins: null,
      carbs: null,
      fats: null,
    })
    expect(result.rows).toEqual([])
    expect(result.issues.map(issue => issue.code)).toEqual([
      'wrong_owner',
      'wrong_date',
    ])
  })

  it('keeps meal calories and row presentation null-aware', () => {
    const rows = [
      { ...base, calories: 120 },
      { ...base, id: 'log-2', calories: null },
    ]
    expect(sumDesktopNutritionMetric(rows, 'calories')).toBeNull()
    expect(presentDesktopNutritionMetric(0)).toBe('0')
    expect(presentDesktopNutritionMetric('12.5')).toBe('12.5')
    expect(presentDesktopNutritionMetric(null)).toBe('—')
    expect(presentDesktopNutritionMetric('invalid')).toBe('—')
  })
})

describe('desktop nutrition day read lifecycle', () => {
  const visible = aggregateDesktopNutritionDay([
    { ...base, calories: 1810, protein: 133, carbs: 203, fat: 49 },
  ], owner, date)
  const initial = { status: 'loading' as const, value: null }
  const ready = { status: 'ready' as const, value: visible }

  it('distinguishes Supabase failure and a network rejection from an empty day', () => {
    expect(readDesktopNutritionDayResponse(null, { code: 'PGRST000' }, owner, date))
      .toEqual({ status: 'failure' })
    expect(settleDesktopNutritionDay(initial, { status: 'failure' }, true))
      .toEqual({ status: 'failure', value: null })
  })

  it('preserves a visible day after an error', () => {
    expect(settleDesktopNutritionDay(ready, { status: 'failure' }, true))
      .toEqual({ status: 'failure', value: visible })
  })

  it('neutralizes an obsolete response', () => {
    const replacement = readDesktopNutritionDayResponse([], null, owner, date)
    expect(settleDesktopNutritionDay(ready, replacement, false)).toBe(ready)
  })
})
