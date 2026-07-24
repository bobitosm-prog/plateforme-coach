import { describe, expect, it } from 'vitest'

import {
  aggregateWeeklyDiagnosticNutrition,
  presentWeeklyDiagnosticMetric,
  previousCompleteZurichWeek,
  readWeeklyDiagnosticNutrient,
} from '@/lib/weekly-diagnostic/nutrition-aggregation'

const WEEK = {
  startInclusive: '2026-07-13',
  endExclusive: '2026-07-20',
} as const

describe('weekly diagnostic Nutrition aggregation', () => {
  it.each([
    ['zero', 0, { status: 'known', value: 0 }],
    ['positive number', 12.5, { status: 'known', value: 12.5 }],
    ['numeric string', '12.5', { status: 'known', value: 12.5 }],
    ['null', null, { status: 'unknown', value: null }],
    ['absent', undefined, { status: 'unknown', value: null }],
    ['empty string', '', { status: 'unknown', value: null }],
    ['non numeric', 'abc', { status: 'invalid', value: null }],
    ['NaN', Number.NaN, { status: 'invalid', value: null }],
    ['Infinity', Number.POSITIVE_INFINITY, { status: 'invalid', value: null }],
    ['negative', -1, { status: 'invalid', value: null }],
  ] as const)('classifies %s without inventing zero', (_label, input, expected) => {
    expect(readWeeklyDiagnosticNutrient(input)).toEqual(expected)
  })

  it('returns an unavailable empty week without false averages', () => {
    expect(aggregateWeeklyDiagnosticNutrition([], WEEK)).toMatchObject({
      status: 'unavailable',
      daysLogged: 0,
      calories: { average: null, knownDays: 0 },
      protein: { average: null, knownDays: 0 },
    })
  })

  it('renders unknown or invalid metrics without a false zero', () => {
    expect(presentWeeklyDiagnosticMetric(null, 0, '%')).toBe('—')
    expect(presentWeeklyDiagnosticMetric(Number.NaN, 0)).toBe('—')
    expect(presentWeeklyDiagnosticMetric(0, 0, '%')).toBe('0%')
    expect(presentWeeklyDiagnosticMetric(12.34, 1, ' g')).toBe('12.3 g')
  })

  it('keeps a partial week averaged over its known day', () => {
    expect(aggregateWeeklyDiagnosticNutrition([
      { date: '2026-07-13', calories: 1800, protein: 130, carbs: 200, fat: 60 },
    ], WEEK)).toMatchObject({
      status: 'partial',
      daysLogged: 1,
      calories: { average: 1800, knownDays: 1 },
      protein: { average: 130, knownDays: 1 },
    })
  })

  it('keeps a complete seven-day week unchanged', () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-07-${String(13 + index).padStart(2, '0')}`,
      calories: 1800 + index * 10,
      protein: 130 + index,
      carbs: 200,
      fat: 60,
    }))
    expect(aggregateWeeklyDiagnosticNutrition(rows, WEEK)).toMatchObject({
      status: 'complete',
      daysLogged: 7,
      calories: { average: 1830, knownDays: 7 },
      protein: { average: 133, knownDays: 7 },
    })
  })

  it('excludes an unknown or invalid metric day instead of lowering its average', () => {
    const result = aggregateWeeklyDiagnosticNutrition([
      { date: '2026-07-13', calories: 1800, protein: 120 },
      { date: '2026-07-14', calories: null, protein: 140 },
      { date: '2026-07-15', calories: 'bad', protein: 160 },
    ], WEEK)
    expect(result).toMatchObject({
      status: 'partial',
      daysLogged: 3,
      calories: { average: 1800, knownDays: 1, unknownDays: 1, invalidDays: 1 },
      protein: { average: 140, knownDays: 3 },
    })
  })

  it('marks a whole metric day unknown when one duplicate row is unknown', () => {
    const result = aggregateWeeklyDiagnosticNutrition([
      { date: '2026-07-13', calories: 1000, protein: 50 },
      { date: '2026-07-13', calories: null, protein: 25 },
      { date: '2026-07-14', calories: 2000, protein: 100 },
    ], WEEK)
    expect(result).toMatchObject({
      daysLogged: 2,
      calories: { average: 2000, knownDays: 1, unknownDays: 1 },
      protein: { average: 87.5, knownDays: 2 },
    })
  })

  it('excludes invalid and out-of-week days', () => {
    const result = aggregateWeeklyDiagnosticNutrition([
      { date: 'not-a-day', calories: 9999, protein: 999 },
      { date: '2026-07-20', calories: 9999, protein: 999 },
      { date: '2026-07-13', calories: 1800, protein: 130 },
    ], WEEK)
    expect(result).toMatchObject({
      daysLogged: 1,
      calories: { average: 1800 },
      protein: { average: 130 },
    })
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_date' }),
      expect.objectContaining({ code: 'outside_week' }),
    ]))
  })

  it('derives the previous complete Zurich week across DST and week changes', () => {
    expect(previousCompleteZurichWeek(new Date('2026-03-30T00:30:00Z'))).toEqual({
      startInclusive: '2026-03-23',
      endExclusive: '2026-03-30',
    })
    expect(previousCompleteZurichWeek(new Date('2026-04-06T12:00:00Z'))).toEqual({
      startInclusive: '2026-03-30',
      endExclusive: '2026-04-06',
    })
  })
})
