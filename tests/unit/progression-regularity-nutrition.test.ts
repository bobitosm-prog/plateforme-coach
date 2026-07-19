import { describe, expect, it } from 'vitest'
import { activeMondayWeeks, aggregateLegacyNutritionByDate, aggregateLegacyWaterByDate, aggregateNutritionByDate, aggregateWaterByDate, legacyCoachStreak, trainingStreak } from '../../lib/progression'

describe('regularity and nutrition aggregations', () => {
  it('keeps canonical training and coach legacy streak strategies separate', () => {
    expect(trainingStreak({ completedLocalDates: ['2026-01-05'], restLocalDates: ['2026-01-04'], todayLocal: '2026-01-05' })).toMatchObject({ status: 'complete', value: { current: 2 } })
    expect(legacyCoachStreak(['2026-01-05T08:00:00Z'], new Date('2026-01-05T12:00:00Z'))).toEqual({ status: 'complete', value: 1, issues: [] })
  })
  it('deduplicates and orders active Monday weeks', () => {
    expect(activeMondayWeeks(['2026-01-06', '2025-12-31', '2026-01-05'])).toEqual({ status: 'complete', value: ['2025-12-29', '2026-01-05'], issues: [] })
  })
  it('aggregates complete nutrients by day without rounding', () => {
    const result = aggregateNutritionByDate([
      { date: '2026-01-01', values: { kcal: 100.25, proteinG: 10, carbsG: 12, fatG: 3, fiberG: 2 } },
      { date: '2026-01-01', values: { kcal: 200.25, proteinG: 20, carbsG: 24, fatG: 6, fiberG: 4 } },
    ])
    expect(result).toMatchObject({ status: 'complete', value: { '2026-01-01': { status: 'complete', values: { kcal: 300.5, proteinG: 30 } } } })
  })
  it('propagates unknown nutrients as partial instead of zero', () => {
    expect(aggregateNutritionByDate([{ date: '2026-01-01', values: { kcal: 0, proteinG: null, carbsG: 0, fatG: 0, fiberG: null } }])).toMatchObject({ status: 'partial', value: { '2026-01-01': { status: 'partial', values: { kcal: 0, proteinG: null } } } })
  })
  it('aggregates water and rejects invalid values', () => {
    expect(aggregateWaterByDate([{ date: '2026-01-02', milliliters: 250 }, { date: '2026-01-02', milliliters: 500 }])).toMatchObject({ status: 'complete', value: [{ date: '2026-01-02', milliliters: 750 }] })
    expect(aggregateWaterByDate([{ date: '2026-01-02', milliliters: -1 }])).toMatchObject({ status: 'invalid' })
  })
  it('keeps the historical null-to-zero analytics strategy named and deterministic', () => {
    expect(aggregateLegacyNutritionByDate([{ date: '2026-01-01', calories: null, protein: 0, carbs: null, fat: 2 }])).toEqual([{ date: '2026-01-01', calories: 0, protein: 0, carbs: 0, fat: 2 }])
    expect(aggregateLegacyWaterByDate([{ date: '2026-01-01', milliliters: null }, { date: '2026-01-01', milliliters: 250 }])).toEqual([{ date: '2026-01-01', ml: 250 }])
  })
})
