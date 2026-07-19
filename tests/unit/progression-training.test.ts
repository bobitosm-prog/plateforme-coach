import { describe, expect, it } from 'vitest'
import { aggregateCompletedSets, durationMinutes, groupCompletedSetsByExercise, groupLegacyWeeklyTonnage, legacyTonnage, percentageChangeLegacy } from '../../lib/progression'
import { trainingSets } from '../fixtures/progression-aggregations'

describe('training aggregations', () => {
  it('counts completed sets, repetitions and tonnage without mutation', () => {
    const copy = structuredClone(trainingSets)
    expect(aggregateCompletedSets(trainingSets)).toMatchObject({ status: 'complete', value: { setCount: 2, repetitions: 15, tonnage: 1300 } })
    expect(trainingSets).toEqual(copy)
  })
  it('keeps the zero-fallback legacy strategy explicit', () => {
    expect(legacyTonnage([{ completed: true, weight: null, reps: 10 }])).toBe(0)
    expect(aggregateCompletedSets([{ completed: true, weight: null, reps: 10 }])).toMatchObject({ status: 'partial', value: { tonnage: null } })
  })
  it('groups completed sets by Monday deterministically', () => {
    expect(groupLegacyWeeklyTonnage({ sets: [...trainingSets].reverse(), timeZone: 'UTC' })).toMatchObject({ status: 'complete', value: [{ week: '2025-12-29', volume: 500 }, { week: '2026-01-05', volume: 800 }] })
  })
  it('characterizes legacy percentage change', () => {
    expect(percentageChangeLegacy([1000, 1250])).toEqual({ status: 'complete', value: 25, issues: [] })
    expect(percentageChangeLegacy([0, 100])).toMatchObject({ status: 'unavailable' })
  })
  it('computes duration and groups completed sets by stable exercise key', () => {
    expect(durationMinutes({ startedAt: new Date('2026-01-01T10:00:00Z'), endedAt: new Date('2026-01-01T10:45:00Z') })).toEqual({ status: 'complete', value: 45, issues: [] })
    expect(groupCompletedSetsByExercise([
      { exerciseId: 'squat', completed: true, weight: 100, reps: 5 },
      { exerciseId: 'bench', completed: true, weight: 80, reps: 10 },
    ])).toMatchObject({ status: 'complete', value: [{ exerciseKey: 'bench' }, { exerciseKey: 'squat' }] })
  })
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid set value %s', weight => {
    expect(aggregateCompletedSets([{ completed: true, weight, reps: 5 }])).toMatchObject({ status: 'invalid' })
  })
})
