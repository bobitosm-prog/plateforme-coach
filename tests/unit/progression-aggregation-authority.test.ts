import { describe, expect, it } from 'vitest'
import {
  auditProgressionAggregationSource,
  compareProgressionAggregationBaseline,
} from '../../lib/progression/aggregation-authority-guard'
import {
  bestSetByEstimatedOneRepMax,
  estimatedOneRepMax,
  legacyTonnage,
} from '../../lib/progression'
import { checkProgressionAggregationAuthority } from '../../scripts/check-progression-aggregation-authority'

describe('Progression aggregation authority', () => {
  it('preserves Epley values and stable best-set ties', () => {
    expect(estimatedOneRepMax(100, 5)).toMatchObject({ status: 'complete', value: 116.7 })
    expect(estimatedOneRepMax(100, 5, null)).toMatchObject({
      status: 'complete',
      value: 116.66666666666667,
    })
    expect(bestSetByEstimatedOneRepMax([
      { id: 'first', weight: 100, reps: 5 },
      { id: 'second', weight: 100, reps: 5 },
      { id: 'lower', weight: 90, reps: 5 },
    ])).toMatchObject({ status: 'complete', value: { id: 'first' } })
    expect(bestSetByEstimatedOneRepMax([
      { id: 'rounded-lower', weight: 100, reps: 5 },
      { id: 'raw-higher', weight: 100.01, reps: 5 },
    ])).toMatchObject({ status: 'complete', value: { id: 'raw-higher' } })
  })

  it('preserves legacy null-to-zero tonnage', () => {
    const sets = [
      { weight: 100, reps: 5 },
      { weight: null, reps: 12 },
      { weight: 60, reps: 8 },
    ]
    expect(legacyTonnage(sets)).toBe(980)
  })

  it('detects newly duplicated Epley and tonnage formulas', () => {
    expect(auditProgressionAggregationSource(
      'fixture.ts',
      'const e1rm = weight * (1 + reps / 30)',
    ).map(value => value.rule)).toContain('epley')
    expect(auditProgressionAggregationSource(
      'fixture.ts',
      'const volume = set.weight * set.reps',
    ).map(value => value.rule)).toContain('tonnage')
  })

  it('allows presenter-only transformations', () => {
    expect(auditProgressionAggregationSource(
      'fixture.ts',
      "const label = `${value.toFixed(1)} kg`",
    )).toEqual([])
  })

  it('signals added and obsolete exact exceptions', () => {
    const actual = auditProgressionAggregationSource(
      'fixture.ts',
      'const volume = set.weight * set.reps',
    )
    expect(compareProgressionAggregationBaseline(actual, []).added).toHaveLength(1)
    expect(compareProgressionAggregationBaseline([], ['fixture.ts:1:tonnage']).missing)
      .toEqual(['fixture.ts:1:tonnage'])
  })

  it('passes on every audited repository consumer', () => {
    expect(checkProgressionAggregationAuthority().comparison)
      .toEqual({ ok: true, added: [], missing: [] })
  })
})
