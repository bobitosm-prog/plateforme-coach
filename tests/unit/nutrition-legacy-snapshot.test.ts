import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  buildNutritionLegacySnapshot,
  emptyNutritionValues,
  projectNutritionSnapshotToLegacy,
  readNutritionLegacySnapshot,
} from '../../lib/nutrition/legacy-snapshot'
import {
  buildSavedMealFoodSnapshots,
  readSavedMealFoodValues,
} from '../../lib/nutrition/saved-meal-snapshot'

const values = (kcal: number | null, proteinG: number | null, carbsG: number | null, fatG: number | null, fiberG: number | null) =>
  ({ kcal, proteinG, carbsG, fatG, fiberG })

describe('versioned Nutrition legacy snapshots', () => {
  it.each([
    ['equal', values(500, 20, 50, 20, 5), values(500, 20, 50, 20, 5), 'equivalent'],
    ['different', values(500, 20, 50, 20, 5), values(600, 20, 50, 20, 5), 'divergent'],
    ['calculated only', values(500, 20, 50, 20, 5), null, null],
    ['declared only', null, values(600, 20, 50, 20, 5), null],
    ['neither', null, null, null],
  ] as const)('keeps calculated and declared totals separate: %s', (_, calculated, declared, concordance) => {
    const result = buildNutritionLegacySnapshot({
      source: 'saved_meal',
      totalProvenance: calculated && declared
        ? 'calculated_and_declared'
        : calculated ? 'calculated' : declared ? 'declared' : 'legacy_unknown',
      legacy: { calories: 500, protein: 20, carbs: 50, fat: 20, fiber: 5 },
      calculated,
      declared,
    })
    expect(result).toMatchObject({
      ok: true,
      snapshot: { schemaVersion: 1, calculated, declared, concordance },
    })
  })

  it.each([
    [{ protein: 18 }, ['protein']],
    [{ proteins: 18 }, ['proteins']],
    [{ protein: 18, proteins: 18 }, ['protein', 'proteins']],
    [{ protein: 0 }, ['protein']],
    [{}, []],
  ] as const)('preserves observed aliases for %#', (legacy, aliases) => {
    const result = buildNutritionLegacySnapshot({
      source: 'saved_meal',
      totalProvenance: 'calculated',
      legacy,
    })
    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        observedAliases: { proteinG: aliases },
        values: { proteinG: 'protein' in legacy ? legacy.protein : 'proteins' in legacy ? legacy.proteins : null },
      },
    })
  })

  it('fails closed on contradictory aliases', () => {
    expect(buildNutritionLegacySnapshot({
      source: 'saved_meal',
      totalProvenance: 'calculated',
      legacy: { protein: 0, proteins: 18 },
    })).toEqual({ ok: false, kind: 'alias_conflict', paths: ['legacy.proteinG'] })
  })

  it('reads unversioned historical snapshots without inventing provenance', () => {
    expect(readNutritionLegacySnapshot({ calories: 100, proteins: 8 })).toMatchObject({
      ok: true,
      snapshot: {
        source: 'legacy_unknown',
        totalProvenance: 'legacy_unknown',
        values: { kcal: 100, proteinG: 8, carbsG: null, fatG: null, fiberG: null },
      },
    })
  })

  it('rejects malformed versioned metadata fail-closed', () => {
    expect(readNutritionLegacySnapshot({
      protein: 18,
      _nutrition_snapshot: {
        kind: 'nutrition_legacy_snapshot',
        schemaVersion: 1,
        source: 'unknown_source',
      },
    } as never)).toEqual({ ok: false, kind: 'invalid_snapshot', paths: ['snapshot'] })
  })

  it('round-trips canonical metadata while preserving every legacy alias', () => {
    const legacy = { calories: 200, proteins: 18, carbs: 15, fats: 6, name: 'Synthétique' }
    const built = buildNutritionLegacySnapshot({
      source: 'saved_meal',
      totalProvenance: 'calculated',
      legacy,
      calculated: values(200, 18, 15, 6, null),
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const projected = projectNutritionSnapshotToLegacy(legacy, built.snapshot)
    expect(projected).toMatchObject(legacy)
    expect(readNutritionLegacySnapshot(projected)).toEqual(built)
  })

  it('builds saved-meal payloads without losing plural aliases', () => {
    const input = [{ name: 'Synthétique', calories: 200, proteins: 18, carbs: 15, fats: 6 }]
    const original = structuredClone(input)
    const result = buildSavedMealFoodSnapshots(input, 'daily_food_log')
    expect(result).toMatchObject({
      ok: true,
      foods: [{ proteins: 18, fats: 6, _nutrition_snapshot: { schemaVersion: 1 } }],
      calculatedTotals: { kcal: 200, proteinG: 18, carbsG: 15, fatG: 6, fiberG: null },
    })
    expect(input).toEqual(original)
    if (result.ok) {
      expect(readSavedMealFoodValues(result.foods[0])).toMatchObject({
        ok: true,
        values: { kcal: 200, proteinG: 18, carbsG: 15, fatG: 6, fiberG: null },
      })
    }
  })

  it('keeps unknown distinct from explicit zero', () => {
    expect(emptyNutritionValues()).toEqual(values(null, null, null, null, null))
    const zero = buildNutritionLegacySnapshot({
      source: 'saved_meal',
      totalProvenance: 'calculated',
      legacy: { protein: 0 },
    })
    expect(zero).toMatchObject({ ok: true, snapshot: { values: { proteinG: 0, fatG: null } } })
  })

  it('does not rewrite the twelve historical proofs', () => {
    const bytes = readFileSync('tests/fixtures/nutrition-total-comparison.ts')
    expect(createHash('sha256').update(bytes).digest('hex'))
      .toBe('cb9afe859dcf7a20b2adf41f20646e51d78a43e5dc5e8e6607e44b0ddc8d0f08')
  })
})
