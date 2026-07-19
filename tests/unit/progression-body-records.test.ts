import { describe, expect, it } from 'vitest'
import { estimatedOneRepMax, groupBestRecords, latestWeight, measurementDelta, movingAverageByObservation, sortWeights, weightDelta, weightGoalProgress } from '../../lib/progression'
import { records, weights } from '../fixtures/progression-aggregations'

describe('body and record aggregations', () => {
  it('sorts weights stably and selects latest', () => {
    expect(sortWeights(weights)).toMatchObject({ status: 'complete', value: [{ date: '2026-01-01' }, { date: '2026-01-02' }, { date: '2026-01-03' }] })
    expect(latestWeight(weights)).toMatchObject({ status: 'complete', value: { date: '2026-01-03', weight: 81 } })
  })
  it('computes weight delta and observation moving average', () => {
    expect(weightDelta(weights)).toMatchObject({ status: 'complete', value: { absolute: 1, relative: 0.0125 } })
    expect(movingAverageByObservation(weights, 2)).toMatchObject({ status: 'complete', value: [{ average: 80 }, { average: 81 }, { average: 81.5 }] })
  })
  it('keeps absence, zero and invalid weights distinct', () => {
    expect(weightGoalProgress({ start: null, current: 80, target: 70 })).toMatchObject({ status: 'unavailable' })
    expect(weightGoalProgress({ start: 0, current: 80, target: 70 })).toMatchObject({ status: 'invalid' })
    expect(weightGoalProgress({ start: 100, current: 90, target: 80 })).toEqual({ status: 'complete', value: 50, issues: [] })
  })
  it('computes signed measurement deltas', () => {
    expect(measurementDelta(80, 82)).toEqual({ status: 'complete', value: -2, issues: [] })
  })
  it('uses Epley and selects deterministic best records', () => {
    expect(estimatedOneRepMax(100, 5)).toEqual({ status: 'complete', value: 116.7, issues: [] })
    expect(groupBestRecords(records)).toMatchObject({ status: 'complete', value: [{ exerciseName: 'Bench' }, { exerciseName: 'Squat', value: 125 }] })
  })
  it('fails closed for unknown record types and incompatible units remain separate', () => {
    expect(groupBestRecords([{ exerciseName: 'Squat', recordType: 'mystery', value: 1, unit: 'kg', achievedAt: null }])).toMatchObject({ status: 'invalid' })
    const result = groupBestRecords([...records, { exerciseName: 'Squat', recordType: '1rm', value: 300, unit: 'lb', achievedAt: '2026-01-03' }])
    expect(result.status === 'complete' ? result.value.filter(item => item.exerciseName === 'Squat') : []).toHaveLength(2)
  })
})
