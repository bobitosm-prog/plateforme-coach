import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  prepareEmptySavedMealInsert,
  prepareSavedMealInsert,
  prepareSavedMealUpdate,
  SAVED_MEAL_ALIAS_CONFLICT_MESSAGE,
  SAVED_MEAL_WRITE_ERROR_MESSAGE,
  savedMealWriteMessage,
} from '../../lib/nutrition/saved-meal-persistence'

const base = {
  userId: 'owner-id',
  name: 'Déjeuner',
  mealType: 'dejeuner',
}

describe('saved_meals persistence contract', () => {
  it('keeps the historical empty Insert payload exact', () => {
    expect(prepareEmptySavedMealInsert(base)).toEqual({
      user_id: 'owner-id',
      name: 'Déjeuner',
      meal_type: 'dejeuner',
      foods: [],
    })
  })

  it.each([
    ['protein only', { protein: 18 }, 18, ['protein']],
    ['proteins only', { proteins: 18 }, 18, ['proteins']],
    ['equal protein aliases', { protein: 18, proteins: 18 }, 18, ['protein', 'proteins']],
    ['fat only', { fat: 6 }, 6, ['fat']],
    ['fats only', { fats: 6 }, 6, ['fats']],
    ['equal fat aliases', { fat: 6, fats: 6 }, 6, ['fat', 'fats']],
  ] as const)('projects %s to singular SQL columns and preserves aliases in JSON', (
    _,
    aliases,
    expected,
    observedAliases,
  ) => {
    const food = { name: 'Synthétique', calories: 200, carbs: 15, ...aliases }
    const result = prepareSavedMealInsert({ ...base, foods: [food] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const nutrient = 'protein' in aliases || 'proteins' in aliases ? 'proteinG' : 'fatG'
    expect(result.payload).toMatchObject({
      total_calories: 200,
      total_carbs: 15,
      [nutrient === 'proteinG' ? 'total_protein' : 'total_fat']: expected,
      foods: [{
        ...aliases,
        _nutrition_snapshot: {
          schemaVersion: 1,
          source: 'daily_food_log',
          totalProvenance: 'calculated',
          observedAliases: { [nutrient]: observedAliases },
        },
      }],
    })
    expect(result.payload).not.toHaveProperty('total_proteins')
    expect(result.payload).not.toHaveProperty('total_fats')
  })

  it('keeps explicit zero distinct from an absent nutrient', () => {
    const result = prepareSavedMealInsert({
      ...base,
      foods: [{ name: 'Zéro', calories: 0, protein: 0 }],
    })
    expect(result).toMatchObject({
      ok: true,
      payload: {
        total_calories: 0,
        total_protein: 0,
        total_carbs: null,
        total_fat: null,
        foods: [{
          _nutrition_snapshot: {
            values: { kcal: 0, proteinG: 0, carbsG: null, fatG: null },
          },
        }],
      },
    })
  })

  it.each([
    [{ protein: 18, proteins: 19 }, 'foods.0.legacy.proteinG'],
    [{ fat: 6, fats: 7 }, 'foods.0.legacy.fatG'],
  ])('fails closed before producing an Insert for conflicting aliases', (aliases, path) => {
    expect(prepareSavedMealInsert({
      ...base,
      foods: [{ name: 'Conflit', ...aliases }],
    })).toEqual({ ok: false, kind: 'alias_conflict', paths: [path] })
  })

  it('produces the exact typed Update payload with versioned foods', () => {
    const result = prepareSavedMealUpdate([
      { name: 'Riz', calories: 120, protein: 3, carbs: 25, fat: 1 },
      { name: 'Œuf', calories: 80, proteins: 7, carbs: 0, fats: 5 },
    ])
    expect(result).toMatchObject({
      ok: true,
      payload: {
        total_calories: 200,
        total_protein: 10,
        total_carbs: 25,
        total_fat: 6,
        foods: [
          { _nutrition_snapshot: { schemaVersion: 1, source: 'saved_meal' } },
          { _nutrition_snapshot: { schemaVersion: 1, source: 'saved_meal' } },
        ],
      },
    })
  })

  it('never exposes a Supabase error or conflicting value in user messages', () => {
    const raw = 'duplicate key owner@example.test protein=18 proteins=19'
    expect(savedMealWriteMessage('persistence_error')).toBe(SAVED_MEAL_WRITE_ERROR_MESSAGE)
    expect(savedMealWriteMessage({
      ok: false,
      kind: 'alias_conflict',
      paths: [raw],
    })).toBe(SAVED_MEAL_ALIAS_CONFLICT_MESSAGE)
    expect(savedMealWriteMessage('persistence_error')).not.toContain(raw)
    expect(SAVED_MEAL_ALIAS_CONFLICT_MESSAGE).not.toMatch(/protein|18|19|Supabase/i)
  })

  it('does not mutate producer inputs', () => {
    const foods = [{ name: 'Riz', calories: 120, proteins: 3 }]
    const original = structuredClone(foods)
    prepareSavedMealUpdate(foods)
    expect(foods).toEqual(original)
  })

  it('does not rewrite historical proofs', () => {
    const bytes = readFileSync('tests/fixtures/nutrition-total-comparison.ts')
    expect(createHash('sha256').update(bytes).digest('hex'))
      .toBe('cb9afe859dcf7a20b2adf41f20646e51d78a43e5dc5e8e6607e44b0ddc8d0f08')
  })
})
