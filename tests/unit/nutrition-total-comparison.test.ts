import { describe, expect, it } from 'vitest'

import { nutritionComparisonFixtures } from '../fixtures/nutrition-total-comparison'
import { aggregateCanonicalTotals, compareLegacyCanonicalTotals } from '../../lib/nutrition/legacy-total-comparison'

describe('legacy/canonical nutrition totals', () => {
  it.each(nutritionComparisonFixtures)('$name -> $expected', fixture => {
    const source = structuredClone(fixture.legacy)
    const canonical = structuredClone(fixture.canonical)
    const result = compareLegacyCanonicalTotals({ legacy: fixture.legacy, canonical: fixture.canonical })
    expect(result.status).toBe(fixture.expected)
    expect(fixture.legacy).toEqual(source)
    expect(fixture.canonical).toEqual(canonical)
  })

  it('reports the characterized distribution', () => {
    const counts = Object.fromEntries(['equivalent', 'within_tolerance', 'divergent', 'partial', 'unavailable', 'invalid'].map(status => [status, 0]))
    for (const fixture of nutritionComparisonFixtures) counts[compareLegacyCanonicalTotals(fixture).status] += 1
    expect(counts).toEqual({ equivalent: 4, within_tolerance: 2, divergent: 2, partial: 2, unavailable: 1, invalid: 1 })
  })

  it('aggregates meals into a day without intermediate rounding', () => {
    const result = aggregateCanonicalTotals([
      { status: 'complete', values: { kcal: 100.25, proteinG: 5.05, carbsG: 10.05, fatG: 4.05, fiberG: 2.05 }, issues: [] },
      { status: 'complete', values: { kcal: 200.25, proteinG: 10.05, carbsG: 20.05, fatG: 8.05, fiberG: 4.05 }, issues: [] },
    ])
    expect(result.status).toBe('complete')
    expect(result.values.kcal).toBeCloseTo(300.5, 12)
    expect(result.values.proteinG).toBeCloseTo(15.1, 12)
    expect(result.values.carbsG).toBeCloseTo(30.1, 12)
    expect(result.values.fatG).toBeCloseTo(12.1, 12)
    expect(result.values.fiberG).toBeCloseTo(6.1, 12)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('fails closed for %s', value => {
    const result = compareLegacyCanonicalTotals({
      legacy: { format: 'daily_food_logs', entries: [{ calories: value, protein: 0, carbs: 0, fat: 0, fiber: 0 }] },
      canonical: { status: 'complete', values: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }, issues: [] },
    })
    expect(result.status).toBe('invalid')
    expect(result.issues).toContainEqual({ code: 'legacy_invalid_value', path: 'entries.0.kcal' })
  })

  it('does not expose raw entries in bounded issues', () => {
    const result = compareLegacyCanonicalTotals({
      legacy: { format: 'daily_food_logs', entries: [{ calories: -1 }] },
      canonical: { status: 'complete', values: { kcal: 1, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }, issues: [] },
    })
    expect(JSON.stringify(result.issues)).not.toContain('-1')
    expect(result.issues.every(issue => Object.keys(issue).sort().join(',') === 'code,path')).toBe(true)
  })
})
