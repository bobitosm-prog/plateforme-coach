import { describe, expect, it } from 'vitest'
import {
  aggregateLegacyMuscleRir28d,
  aggregateLegacyMuscleVolume28d,
  buildLegacyAnalyticsCsvRows,
  buildLegacyAnalyticsSummary,
  buildLegacyCalorieSeries,
  buildLegacyExerciseProgression,
  buildLegacyMacroSeries,
  buildLegacyWaterSeries,
  buildLegacyWeightSeries,
  groupMixedLocalUtcLegacyWeeklyTonnage,
  legacyMixedLocalUtcMondayKey,
  mondayWeekBounds,
} from '../../lib/progression'
import { analyticsClock, analyticsSessions } from '../fixtures/progression-analytics'

describe('AnalyticsSection pure legacy calculations', () => {
  it('keeps the maximum daily e1RM and stable exercise/date ordering', () => {
    const copy = structuredClone(analyticsSessions)
    const result = buildLegacyExerciseProgression(analyticsSessions)
    expect(result.exerciseList).toEqual(['Bench'])
    expect(result.byExercise.Bench).toEqual([
      { date: '2026-03-30', e1rm: 119, weight: 102, reps: 5 },
      { date: '2026-03-31', e1rm: 114, weight: 90, reps: 8 },
    ])
    expect(analyticsSessions).toEqual(copy)
  })

  it('aggregates the 28-day muscle volume and applies the five-set RIR threshold', () => {
    const muscleByExerciseId = new Map([['bench', 'chest']])
    expect(aggregateLegacyMuscleVolume28d({ sessions: analyticsSessions, muscleByExerciseId, clock: analyticsClock })).toMatchObject({ status: 'complete', value: [{ muscle: 'chest', sets: 5, tonnage: 3370 }] })
    expect(aggregateLegacyMuscleRir28d({ sessions: analyticsSessions, muscleByExerciseId, clock: analyticsClock })).toMatchObject({ status: 'complete', value: [{ muscle: 'chest', avgRir: 2.4, count: 5 }] })
  })

  it('filters weight by the injected clock and keeps the seven-observation legacy trend', () => {
    const weights = Array.from({ length: 8 }, (_, index) => ({ date: `2026-03-${String(24 + index).padStart(2, '0')}`, weight: 80 + index }))
    const copy = structuredClone(weights)
    const result = buildLegacyWeightSeries({ weights, period: '30j', clock: analyticsClock })
    expect(result.at(-1)).toEqual({ date: '2026-03-31', weight: 87, trend: 84 })
    expect(weights).toEqual(copy)
  })

  it('preserves visible rounding and zero semantics for nutrition and water', () => {
    expect(buildLegacyCalorieSeries([{ date: '2026-03-31', calories: 1099.6 }], 1000)).toEqual([{ date: '2026-03-31', calories: 1100, inTarget: true }])
    expect(buildLegacyMacroSeries([{ date: '2026-03-31', protein: 0, carbs: 12.5, fat: 4.4 }])).toEqual([{ date: '2026-03-31', protein: 0, carbs: 13, fat: 4 }])
    expect(buildLegacyWaterSeries([{ date: '2026-03-31', ml: 1499.6 }])).toEqual([{ date: '2026-03-31', litres: 1.5 }])
  })

  it('builds 30-day summary and the exact sparse CSV rows deterministically', () => {
    expect(buildLegacyAnalyticsSummary({
      weights: [{ date: '2026-03-03', weight: 82 }, { date: '2026-03-31', weight: 80.5 }],
      records: [{ achieved_at: '2026-03-02' }, { achieved_at: null }], clock: analyticsClock,
    })).toEqual({ monthWeightDiff: -1.5, monthRecordCount: 1 })
    expect(buildLegacyAnalyticsCsvRows({
      weights: [{ date: '2026-03-02', weight: 80 }],
      calories: [{ date: '2026-03-01', calories: 2000, protein: 150, carbs: 200, fat: 60 }],
      water: [{ date: '2026-03-02', ml: 0 }],
    })).toEqual([
      ['2026-03-01', null, 2000, 150, 200, 60, null],
      ['2026-03-02', 80, null, null, null, null, null],
    ])
  })

  it('keeps mixed local/UTC weekly keys separate from canonical local Monday near DST', () => {
    const instant = '2026-03-29T22:30:00.000Z'
    expect(legacyMixedLocalUtcMondayKey(instant, 'Europe/Zurich')).toMatchObject({ status: 'complete', value: '2026-03-29' })
    expect(mondayWeekBounds('2026-03-30')).toMatchObject({ status: 'complete', value: { startInclusive: '2026-03-30' } })
    expect(groupMixedLocalUtcLegacyWeeklyTonnage({ sets: [{ createdAt: instant, completed: true, weight: 100, reps: 5 }], timeZone: 'Europe/Zurich' })).toMatchObject({ status: 'complete', value: [{ week: '2026-03-29', volume: 500 }] })
  })

  it('fails closed for invalid clocks, numbers and dates without NaN propagation', () => {
    expect(aggregateLegacyMuscleVolume28d({ sessions: analyticsSessions, muscleByExerciseId: new Map([['bench', 'chest']]), clock: { now: () => new Date('invalid') } })).toMatchObject({ status: 'invalid' })
    expect(aggregateLegacyMuscleRir28d({ sessions: [{ workout_sets: [{ completed: true, exercise_id: 'x', rir: Number.NaN, created_at: '2026-03-31' }] }], muscleByExerciseId: new Map([['x', 'chest']]), clock: analyticsClock })).toMatchObject({ status: 'invalid' })
    expect(legacyMixedLocalUtcMondayKey('invalid', 'Europe/Zurich')).toMatchObject({ status: 'invalid' })
    expect(buildLegacyCalorieSeries([{ date: '2026-03-31', calories: Number.NaN }], 2000)).toEqual([])
    expect(buildLegacyMacroSeries([{ date: '2026-03-31', protein: -1, carbs: 0, fat: 0 }])).toEqual([])
    expect(buildLegacyWaterSeries([{ date: '2026-03-31', ml: Number.POSITIVE_INFINITY }])).toEqual([])
    expect(buildLegacyAnalyticsCsvRows({ weights: [{ date: 'invalid', weight: 80 }], calories: [], water: [] })).toEqual([])
  })

  it('keeps mixed weekly boundaries deterministic across Sunday, year and DST changes', () => {
    expect(legacyMixedLocalUtcMondayKey('2026-01-04T12:00:00.000Z', 'Europe/Zurich')).toMatchObject({ status: 'complete', value: '2025-12-29' })
    expect(legacyMixedLocalUtcMondayKey('2026-01-05T12:00:00.000Z', 'Europe/Zurich')).toMatchObject({ status: 'complete', value: '2026-01-05' })
    expect(legacyMixedLocalUtcMondayKey('2026-10-25T23:30:00.000Z', 'Europe/Zurich')).toMatchObject({ status: 'complete', value: '2026-10-25' })
  })
})
