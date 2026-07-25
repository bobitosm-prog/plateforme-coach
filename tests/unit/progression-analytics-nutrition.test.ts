import { describe, expect, it } from 'vitest'

import {
  aggregateAnalyticsNutritionByDate,
  settleAnalyticsNutritionDays,
  type AnalyticsNutritionRow,
} from '../../lib/progression/analytics-nutrition'

const rows = (value: unknown): readonly AnalyticsNutritionRow[] =>
  value as readonly AnalyticsNutritionRow[]

describe('Analytics nutrition aggregation', () => {
  it('distinguishes an empty period from complete data', () => {
    expect(aggregateAnalyticsNutritionByDate([])).toEqual({
      status: 'unavailable',
      days: [],
      issues: [],
    })
    expect(aggregateAnalyticsNutritionByDate([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-20', calories: 200, protein: 15, carbs: 30, fat: 6 },
    ])).toEqual({
      status: 'complete',
      days: [{ date: '2026-07-20', calories: 300, protein: 25, carbs: 50, fat: 11 }],
      issues: [],
    })
  })

  it('preserves a real zero as known', () => {
    expect(aggregateAnalyticsNutritionByDate([
      { date: '2026-07-20', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ])).toMatchObject({
      status: 'complete',
      days: [{ date: '2026-07-20', calories: 0, protein: 0, carbs: 0, fat: 0 }],
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ])('keeps %s unknown without discarding valid metrics from the same day', (_label, unknown) => {
    const result = aggregateAnalyticsNutritionByDate(rows([
      { date: '2026-07-20', calories: 100, protein: unknown, carbs: 20, fat: 5 },
    ]))
    expect(result).toMatchObject({
      status: 'partial',
      days: [{ date: '2026-07-20', calories: 100, protein: null, carbs: 20, fat: 5 }],
      issues: [{ code: 'unknown_metric', date: '2026-07-20', metric: 'protein' }],
    })
  })

  it('treats an absent field as unknown', () => {
    const result = aggregateAnalyticsNutritionByDate(rows([
      { date: '2026-07-20', calories: 100, protein: 10, fat: 5 },
    ]))
    expect(result.days).toEqual([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: null, fat: 5 },
    ])
    expect(result.issues).toContainEqual({
      code: 'unknown_metric',
      path: 'rows.0.carbs',
      date: '2026-07-20',
      metric: 'carbs',
    })
  })

  it('accepts finite non-negative numeric strings', () => {
    expect(aggregateAnalyticsNutritionByDate(rows([
      { date: '2026-07-20', calories: '100.5', protein: '10', carbs: '0', fat: '5.5' },
    ]))).toEqual({
      status: 'complete',
      days: [{ date: '2026-07-20', calories: 100.5, protein: 10, carbs: 0, fat: 5.5 }],
      issues: [],
    })
  })

  it.each([
    ['non-numeric string', 'abc'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -1],
  ])('marks %s invalid without discarding a valid metric from the same day', (_label, invalid) => {
    const result = aggregateAnalyticsNutritionByDate(rows([
      { date: '2026-07-20', calories: 100, protein: invalid, carbs: 20, fat: 5 },
    ]))
    expect(result).toMatchObject({
      status: 'partial',
      days: [{ date: '2026-07-20', calories: 100, protein: null, carbs: 20, fat: 5 }],
      issues: [{ code: 'invalid_metric', date: '2026-07-20', metric: 'protein' }],
    })
  })

  it('omits days without logs instead of synthesizing zero bars', () => {
    expect(aggregateAnalyticsNutritionByDate([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-22', calories: 200, protein: 20, carbs: 30, fat: 6 },
    ]).days.map(day => day.date)).toEqual(['2026-07-20', '2026-07-22'])
  })

  it('invalidates only the affected day metric when duplicate rows disagree in quality', () => {
    const result = aggregateAnalyticsNutritionByDate([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-20', calories: 50, protein: null, carbs: 5, fat: 1 },
    ])
    expect(result.days).toEqual([
      { date: '2026-07-20', calories: 150, protein: null, carbs: 25, fat: 6 },
    ])
  })

  it('keeps visible data on a read failure and ignores obsolete responses', () => {
    const visible = [{ date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 }] as const
    expect(settleAnalyticsNutritionDays(visible, { status: 'failure' }, true)).toBe(visible)
    expect(settleAnalyticsNutritionDays(visible, { status: 'ready', days: [] }, true)).toEqual([])
    expect(settleAnalyticsNutritionDays(visible, {
      status: 'ready',
      days: [{ date: '2026-07-21', calories: 200, protein: 20, carbs: 30, fat: 6 }],
    }, false)).toBe(visible)
  })
})
