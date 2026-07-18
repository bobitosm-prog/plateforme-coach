import { describe, expect, it } from 'vitest'
import {
  aggregateNutrition,
  calculateMacroEnergy,
  calculateNutritionAmount,
  compareDeclaredEnergy,
  roundNutritionForDisplay,
  type NutritionDensity,
  type NutritionValues,
} from '../../lib/nutrition/invariants'

const completeValues: NutritionValues = {
  kcal: 200,
  proteinG: 10,
  carbsG: 20,
  fatG: 8,
  fiberG: 4,
}

const per100g: NutritionDensity = { basis: { kind: 'per_100_g' }, values: completeValues }

describe('canonical nutrition invariants', () => {
  it('calculates protein, carbohydrate and fat energy with 4/4/9 factors', () => {
    expect(calculateMacroEnergy({ proteinG: 10, carbsG: 20, fatG: 5 })).toEqual({
      status: 'complete',
      kcal: 165,
      issues: [],
    })
  })

  it('keeps explicit zero distinct from unknown macro values', () => {
    expect(calculateMacroEnergy({ proteinG: 0, carbsG: 0, fatG: 0 })).toMatchObject({ status: 'complete', kcal: 0 })
    expect(calculateMacroEnergy({ proteinG: null, carbsG: 0, fatG: 0 })).toMatchObject({ status: 'unavailable', kcal: null })
  })

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY], [Number.NEGATIVE_INFINITY]])(
    'rejects invalid macro value %s without propagating NaN',
    value => {
      const result = calculateMacroEnergy({ proteinG: value, carbsG: 1, fatG: 1 })
      expect(result.status).toBe('invalid')
      expect(result.kcal).toBeNull()
    },
  )

  it('scales a per-100-g density for half, double and fractional portions', () => {
    expect(calculateNutritionAmount(per100g, { kind: 'mass', grams: 50 }).values).toEqual({ kcal: 100, proteinG: 5, carbsG: 10, fatG: 4, fiberG: 2 })
    expect(calculateNutritionAmount(per100g, { kind: 'mass', grams: 200 }).values).toEqual({ kcal: 400, proteinG: 20, carbsG: 40, fatG: 16, fiberG: 8 })
    expect(calculateNutritionAmount(per100g, { kind: 'mass', grams: 12.5 }).values).toEqual({ kcal: 25, proteinG: 1.25, carbsG: 2.5, fatG: 1, fiberG: 0.5 })
  })

  it('scales a per-100-ml density only with volume', () => {
    const density: NutritionDensity = { basis: { kind: 'per_100_ml' }, values: completeValues }
    expect(calculateNutritionAmount(density, { kind: 'volume', milliliters: 250 })).toMatchObject({
      status: 'complete',
      values: { kcal: 500, proteinG: 25, carbsG: 50, fatG: 20, fiberG: 10 },
    })
    expect(calculateNutritionAmount(density, { kind: 'mass', grams: 250 })).toMatchObject({ status: 'unavailable' })
  })

  it('scales matching named portions and units', () => {
    const portion = calculateNutritionAmount(
      { basis: { kind: 'per_portion', portionId: 'bowl-v1' }, values: completeValues },
      { kind: 'portion', portionId: 'bowl-v1', count: 0.5 },
    )
    const unit = calculateNutritionAmount(
      { basis: { kind: 'per_unit', unitId: 'egg-medium-v1' }, values: completeValues },
      { kind: 'unit', unitId: 'egg-medium-v1', count: 2 },
    )
    expect(portion.values.kcal).toBe(100)
    expect(unit.values.kcal).toBe(400)
  })

  it('fails closed for mismatched portion identifiers and mass/volume conversion', () => {
    const mismatch = calculateNutritionAmount(
      { basis: { kind: 'per_portion', portionId: 'small' }, values: completeValues },
      { kind: 'portion', portionId: 'large', count: 1 },
    )
    expect(mismatch).toMatchObject({ status: 'unavailable', values: { kcal: null } })
    expect(calculateNutritionAmount(per100g, { kind: 'volume', milliliters: 100 })).toMatchObject({ status: 'unavailable' })
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid quantity %s', grams => {
    const result = calculateNutritionAmount(per100g, { kind: 'mass', grams })
    expect(result).toMatchObject({ status: 'invalid', values: { kcal: null } })
  })

  it('preserves known nutrients and marks unknown fiber as partial', () => {
    const result = calculateNutritionAmount(
      { basis: { kind: 'per_100_g' }, values: { ...completeValues, fiberG: null } },
      { kind: 'mass', grams: 150 },
    )
    expect(result).toMatchObject({
      status: 'partial',
      values: { kcal: 300, proteinG: 15, carbsG: 30, fatG: 12, fiberG: null },
    })
    expect(result.issues).toContainEqual({ code: 'unknown_nutrient_value', path: 'values.fiberG' })
  })

  it('rejects negative, NaN and infinite density values', () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = calculateNutritionAmount(
        { basis: { kind: 'per_100_g' }, values: { ...completeValues, proteinG: value } },
        { kind: 'mass', grams: 100 },
      )
      expect(result.status).toBe('invalid')
      expect(Object.values(result.values).every(item => item === null)).toBe(true)
    }
  })

  it('aggregates foods, meals and days without rounding intermediate values', () => {
    const first = calculateNutritionAmount(per100g, { kind: 'mass', grams: 33.333 })
    const second = calculateNutritionAmount(per100g, { kind: 'mass', grams: 66.667 })
    const meal = aggregateNutrition([{ id: 'first', result: first }, { id: 'second', result: second }])
    const day = aggregateNutrition([{ id: 'meal', result: meal }, { id: 'another-meal', result: meal }])
    expect(meal.status).toBe('complete')
    expect(meal.values.kcal).toBeCloseTo(200, 12)
    expect(day.values.kcal).toBeCloseTo(400, 12)
    expect(day.values.proteinG).toBeCloseTo(20, 12)
  })

  it('marks aggregate totals partial and never substitutes unknown nutrients with zero', () => {
    const known = calculateNutritionAmount(per100g, { kind: 'mass', grams: 100 })
    const partial = calculateNutritionAmount(
      { basis: { kind: 'per_100_g' }, values: { ...completeValues, carbsG: null } },
      { kind: 'mass', grams: 100 },
    )
    const total = aggregateNutrition([{ id: 'known', result: known }, { id: 'partial', result: partial }])
    expect(total).toMatchObject({ status: 'partial', values: { kcal: 400, proteinG: 20, carbsG: null, fatG: 16, fiberG: 8 } })
  })

  it('keeps unavailable entries visible as a partial aggregate', () => {
    const known = calculateNutritionAmount(per100g, { kind: 'mass', grams: 100 })
    const unavailable = calculateNutritionAmount(per100g, { kind: 'unit', unitId: 'unknown', count: 1 })
    const total = aggregateNutrition([{ id: 'known', result: known }, { id: 'legacy', result: unavailable }])
    expect(total.status).toBe('partial')
    expect(Object.values(total.values).every(item => item === null)).toBe(true)
    expect(total.issues.some(entry => entry.path.startsWith('entries.legacy'))).toBe(true)
  })

  it('returns unavailable for an empty aggregate instead of a misleading zero total', () => {
    expect(aggregateNutrition([])).toMatchObject({ status: 'unavailable', values: { kcal: null } })
  })

  it('rounds only through the display boundary and preserves unknown values', () => {
    const source: NutritionValues = { kcal: 123.55, proteinG: 1.255, carbsG: 2.244, fatG: 3.266, fiberG: null }
    const rounded = roundNutritionForDisplay(source)
    expect(rounded).toEqual({ kcal: 124, proteinG: 1.3, carbsG: 2.2, fatG: 3.3, fiberG: null })
    expect(source).toEqual({ kcal: 123.55, proteinG: 1.255, carbsG: 2.244, fatG: 3.266, fiberG: null })
  })

  it('compares declared and macro energy only with an explicit tolerance', () => {
    const macroEnergy = calculateMacroEnergy({ proteinG: 10, carbsG: 20, fatG: 5 })
    expect(compareDeclaredEnergy({ declaredKcal: 170, macroEnergy, toleranceKcal: 5 })).toMatchObject({ status: 'within_tolerance', differenceKcal: 5 })
    expect(compareDeclaredEnergy({ declaredKcal: 171, macroEnergy, toleranceKcal: 5 })).toMatchObject({ status: 'outside_tolerance', differenceKcal: 6 })
    expect(compareDeclaredEnergy({ declaredKcal: null, macroEnergy, toleranceKcal: 5 })).toMatchObject({ status: 'indeterminate' })
    expect(compareDeclaredEnergy({ declaredKcal: 165, macroEnergy, toleranceKcal: -1 })).toMatchObject({ status: 'invalid' })
  })

  it('is deterministic and does not mutate density, quantity or aggregate inputs', () => {
    const density = structuredClone(per100g)
    const quantity = { kind: 'mass' as const, grams: 37.5 }
    const densityBefore = structuredClone(density)
    const quantityBefore = structuredClone(quantity)
    const first = calculateNutritionAmount(density, quantity)
    const second = calculateNutritionAmount(density, quantity)
    const entries = [{ id: 'food', result: first }] as const
    const entriesBefore = structuredClone(entries)
    expect(second).toEqual(first)
    expect(aggregateNutrition(entries)).toEqual(aggregateNutrition(entries))
    expect(density).toEqual(densityBefore)
    expect(quantity).toEqual(quantityBefore)
    expect(entries).toEqual(entriesBefore)
  })
})
