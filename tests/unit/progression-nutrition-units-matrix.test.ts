import { describe, expect, it } from 'vitest'
import {
  aggregateCompletedSets,
  durationMinutes,
  groupBestRecords,
  measurementDelta,
  sortWeights,
} from '../../lib/progression'
import {
  aggregateNutrition,
  calculateNutritionAmount,
  roundNutritionForDisplay,
  type NutritionDensity,
} from '../../lib/nutrition/invariants'

const values = { kcal: 123.456, proteinG: 10.25, carbsG: 20.5, fatG: 4.75, fiberG: 2.5 }

describe('body, training and nutrition unit matrix', () => {
  it('keeps kg and lb records separate without implicit conversion', () => {
    const result = groupBestRecords([
      { exerciseName: 'Squat', recordType: '1rm', value: 100, unit: 'kg', achievedAt: '2026-01-01' },
      { exerciseName: 'Squat', recordType: '1rm', value: 220, unit: 'lb', achievedAt: '2026-01-02' },
    ])
    expect(result.status === 'complete' ? result.value.map(record => record.unit) : []).toEqual(['kg', 'lb'])
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid body weight %s', weight => {
    expect(sortWeights([{ date: '2026-01-01', weight }])).toMatchObject({ status: 'invalid' })
  })

  it('keeps centimeters as opaque measurements and zero explicit', () => {
    expect(measurementDelta(0, 2.54)).toEqual({ status: 'complete', value: -2.54, issues: [] })
    expect(measurementDelta(null, 2.54)).toMatchObject({ status: 'unavailable' })
  })

  it('converts elapsed milliseconds to minutes without intermediate rounding', () => {
    expect(durationMinutes({ startedAt: new Date('2026-01-01T10:00:00.000Z'), endedAt: new Date('2026-01-01T10:01:30.000Z') })).toEqual({ status: 'complete', value: 1.5, issues: [] })
  })

  it('keeps repetitions, set count and kg-like tonnage numeric and partial-aware', () => {
    expect(aggregateCompletedSets([{ completed: true, weight: 0, reps: 0 }])).toMatchObject({ status: 'complete', value: { setCount: 1, repetitions: 0, tonnage: 0 } })
    expect(aggregateCompletedSets([{ completed: true, weight: null, reps: 5 }])).toMatchObject({ status: 'partial', value: { repetitions: 5, tonnage: null } })
  })

  it.each([
    [{ basis: { kind: 'per_100_g' }, values } as NutritionDensity, { kind: 'mass', grams: 1000 } as const, 1234.56],
    [{ basis: { kind: 'per_100_ml' }, values } as NutritionDensity, { kind: 'volume', milliliters: 1000 } as const, 1234.56],
    [{ basis: { kind: 'per_portion', portionId: 'bowl' }, values } as NutritionDensity, { kind: 'portion', portionId: 'bowl', count: 0.5 } as const, 61.728],
    [{ basis: { kind: 'per_unit', unitId: 'egg' }, values } as NutritionDensity, { kind: 'unit', unitId: 'egg', count: 2 } as const, 246.912],
  ])('scales explicit canonical basis without intermediate rounding', (density, quantity, kcal) => {
    expect(calculateNutritionAmount(density, quantity)).toMatchObject({ status: 'complete', values: { kcal } })
  })

  it.each([
    [{ basis: { kind: 'per_100_g' }, values } as NutritionDensity, { kind: 'volume', milliliters: 100 } as const],
    [{ basis: { kind: 'per_100_ml' }, values } as NutritionDensity, { kind: 'mass', grams: 100 } as const],
    [{ basis: { kind: 'per_portion', portionId: 'small' }, values } as NutritionDensity, { kind: 'portion', portionId: 'large', count: 1 } as const],
    [{ basis: { kind: 'per_unit', unitId: 'egg' }, values } as NutritionDensity, { kind: 'unit', unitId: 'apple', count: 1 } as const],
  ])('refuses incompatible or ambiguous conversion', (density, quantity) => {
    expect(calculateNutritionAmount(density, quantity)).toMatchObject({ status: 'unavailable', values: { kcal: null } })
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid nutrition quantity %s', amount => {
    expect(calculateNutritionAmount({ basis: { kind: 'per_100_g' }, values }, { kind: 'mass', grams: amount })).toMatchObject({ status: 'invalid' })
  })

  it('keeps unknown nutrients distinct from explicit zero through aggregation', () => {
    const knownZero = calculateNutritionAmount({ basis: { kind: 'per_100_g' }, values: { ...values, fiberG: 0 } }, { kind: 'mass', grams: 100 })
    const unknown = calculateNutritionAmount({ basis: { kind: 'per_100_g' }, values: { ...values, fiberG: null } }, { kind: 'mass', grams: 100 })
    expect(knownZero).toMatchObject({ status: 'complete', values: { fiberG: 0 } })
    expect(aggregateNutrition([{ id: 'zero', result: knownZero }, { id: 'unknown', result: unknown }])).toMatchObject({ status: 'partial', values: { fiberG: null } })
  })

  it('rounds only at the documented display boundary and remains immutable', () => {
    const source = structuredClone(values)
    expect(roundNutritionForDisplay(source)).toEqual({ kcal: 123, proteinG: 10.3, carbsG: 20.5, fatG: 4.8, fiberG: 2.5 })
    expect(source).toEqual(values)
  })
})
