import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { nutritionComparisonFixtures } from '../fixtures/nutrition-total-comparison'
import {
  compareLegacyCanonicalTotals,
  DEFAULT_TOTAL_TOLERANCE,
  LEGACY_NUTRIENT_ALIASES,
  TOTAL_CONCORDANCE_POLICY,
} from '../../lib/nutrition/legacy-total-comparison'

const RAW_FIXTURE_SHA256 = 'cb9afe859dcf7a20b2adf41f20646e51d78a43e5dc5e8e6607e44b0ddc8d0f08'

const decisions = [
  ['100 g catalogue', 'equivalent', 'exact_same_basis'],
  ['100 ml catalogue', 'equivalent', 'exact_same_basis'],
  ['portion nommée', 'equivalent', 'exact_named_portion'],
  ['unité double', 'equivalent', 'exact_named_unit'],
  ['arrondi historique kcal', 'within_tolerance', 'legacy_item_rounding'],
  ['arrondi historique macros', 'within_tolerance', 'legacy_item_rounding'],
  ['totaux déclarés divergents', 'divergent', 'incoherent_declared_total'],
  ['alias sauvegardé ignoré par affichage singulier', 'divergent', 'information_lost_before_boundary'],
  ['journal sans fibres', 'partial', 'fiber_absent_from_legacy'],
  ['zéro legacy masque valeur inconnue', 'partial', 'canonical_energy_and_legacy_fiber_unknown'],
  ['conversion masse volume impossible', 'unavailable', 'incompatible_units_without_density'],
  ['valeur legacy négative', 'invalid', 'negative_legacy_value'],
] as const

describe('Nutrition total concordance policy', () => {
  it('keeps the twelve raw proof fixtures byte-identical', () => {
    const bytes = readFileSync('tests/fixtures/nutrition-total-comparison.ts')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(RAW_FIXTURE_SHA256)
  })

  it('freezes statuses, tolerances and aliases explicitly', () => {
    expect(TOTAL_CONCORDANCE_POLICY).toEqual({
      version: 1,
      toleranceMode: 'absolute_or_relative',
      intermediateRounding: 'forbidden',
      statuses: ['equivalent', 'within_tolerance', 'divergent', 'partial', 'unavailable', 'invalid'],
    })
    expect(DEFAULT_TOTAL_TOLERANCE).toEqual({ absoluteKcal: 1, absoluteGrams: 0.1, relative: 0.005 })
    expect(LEGACY_NUTRIENT_ALIASES).toEqual({
      kcal: ['calories', 'kcal'],
      proteinG: ['protein', 'proteins', 'prot'],
      carbsG: ['carbs', 'carb'],
      fatG: ['fat', 'fats'],
      fiberG: ['fiber', 'fibers'],
    })
  })

  it('requires an explicit, stable decision for every fixture', () => {
    expect(decisions.map(([name]) => name)).toEqual(nutritionComparisonFixtures.map(fixture => fixture.name))
    expect(decisions.map(([name]) => [
      name,
      compareLegacyCanonicalTotals(
        nutritionComparisonFixtures.find(fixture => fixture.name === name)!,
      ).status,
    ])).toEqual(decisions.map(([name, status]) => [name, status]))
  })

  it('keeps the two fully comparable divergences visible with exact differences', () => {
    const declared = compareLegacyCanonicalTotals(nutritionComparisonFixtures[6])
    const lostAlias = compareLegacyCanonicalTotals(nutritionComparisonFixtures[7])
    expect(declared.nutrients.find(value => value.nutrient === 'kcal')).toMatchObject({
      status: 'divergent',
      legacy: 600,
      canonical: 500,
      absoluteDifference: 100,
      relativeDifference: 1 / 6,
    })
    expect(lostAlias.nutrients.find(value => value.nutrient === 'proteinG')).toMatchObject({
      status: 'divergent',
      legacy: 0,
      canonical: 18,
      absoluteDifference: 18,
      relativeDifference: 1,
    })
  })

  it('uses only the explicitly registered plural aliases', () => {
    const result = compareLegacyCanonicalTotals({
      legacy: {
        format: 'saved_meal_foods',
        entries: [{ calories: 200, proteins: 18, carbs: 15, fats: 6, fibers: 2 }],
      },
      canonical: {
        status: 'complete',
        values: { kcal: 200, proteinG: 18, carbsG: 15, fatG: 6, fiberG: 2 },
        issues: [],
      },
    })
    expect(result.status).toBe('equivalent')
  })

  it('compares known components but never turns missing legacy nutrients into comparable zeroes', () => {
    const missingFiber = compareLegacyCanonicalTotals(nutritionComparisonFixtures[8])
    expect(missingFiber.legacy.fiberG).toBe(0)
    expect(missingFiber.legacyComparable.fiberG).toBeNull()
    expect(missingFiber.nutrients.find(value => value.nutrient === 'fiberG')).toMatchObject({
      status: 'unavailable',
      legacy: null,
      canonical: 7,
      absoluteDifference: null,
    })
    expect(missingFiber.nutrients.filter(value => value.nutrient !== 'fiberG').every(value => value.status === 'equivalent')).toBe(true)

    const unknownEnergy = compareLegacyCanonicalTotals(nutritionComparisonFixtures[9])
    expect(unknownEnergy.legacyComparable.fiberG).toBeNull()
    expect(unknownEnergy.canonical.kcal).toBeNull()
    expect(unknownEnergy.status).toBe('partial')
  })
})
