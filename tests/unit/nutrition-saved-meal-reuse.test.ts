import { describe, expect, it, vi } from 'vitest'

import {
  persistSavedMealReuse,
  prepareSavedMealReuse,
  SAVED_MEAL_REUSE_CONFLICT_MESSAGE,
  SAVED_MEAL_REUSE_WRITE_ERROR_MESSAGE,
  savedMealReuseMessage,
} from '../../lib/nutrition/saved-meal-reuse'
import { prepareSavedMealInsert } from '../../lib/nutrition/saved-meal-persistence'

const input = (foods: readonly Record<string, unknown>[]) => ({
  meal: { id: 'meal-id', foods },
  userId: 'owner-id',
  targetDate: '2026-07-24',
  targetMealType: 'dejeuner',
})

describe('saved_meals reuse preparation', () => {
  it('adapts an unversioned historical meal without rewriting it', () => {
    const foods = [{ name: 'Riz', quantity: 125, calories: 200, proteins: 4, carbs: 40, fats: 2 }]
    const original = structuredClone(foods)
    expect(prepareSavedMealReuse(input(foods))).toEqual({
      status: 'ready',
      inserts: [{
        user_id: 'owner-id',
        date: '2026-07-24',
        meal_type: 'dejeuner',
        custom_name: 'Riz',
        quantity_g: 125,
        calories: 200,
        protein: 4,
        carbs: 40,
        fat: 2,
      }],
    })
    expect(foods).toEqual(original)
  })

  it('uses a valid v1 snapshot as the nutrition authority', () => {
    const saved = prepareSavedMealInsert({
      userId: 'owner-id',
      name: 'Déjeuner',
      mealType: 'dejeuner',
      foods: [{ name: 'Œuf', calories: 80, protein: 7, carbs: 0, fat: 5 }],
    })
    expect(saved.ok).toBe(true)
    if (!saved.ok || !Array.isArray(saved.payload.foods)) return
    expect(prepareSavedMealReuse(input(saved.payload.foods as never[]))).toMatchObject({
      status: 'ready',
      inserts: [{ calories: 80, protein: 7, carbs: 0, fat: 5 }],
    })
  })

  it.each([
    [{ protein: 7 }, 7],
    [{ proteins: 7 }, 7],
    [{ protein: 7, proteins: 7 }, 7],
    [{ protein: 0 }, 0],
  ])('preserves supported protein aliases %#', (aliases, expected) => {
    expect(prepareSavedMealReuse(input([{ name: 'Aliment', calories: 80, ...aliases }]))).toMatchObject({
      status: 'ready',
      inserts: [{ protein: expected }],
    })
  })

  it('rejects contradictory aliases before persistence', () => {
    expect(prepareSavedMealReuse(input([{
      name: 'Conflit',
      calories: 80,
      protein: 7,
      proteins: 8,
    }]))).toEqual({ status: 'alias_conflict', code: 'conflicting_nutrients' })
  })

  it('keeps unknown optional macros as null', () => {
    expect(prepareSavedMealReuse(input([{ name: 'Incomplet', calories: 80 }]))).toMatchObject({
      status: 'ready',
      inserts: [{ calories: 80, protein: null, carbs: null, fat: null }],
    })
  })

  it.each([
    ['empty foods', input([]), { status: 'unsupported', code: 'empty_meal' }],
    ['missing calories', input([{ name: 'Sans énergie', protein: 2 }]), { status: 'unsupported', code: 'missing_required_calories' }],
    ['invalid food', input([{ calories: 80 }]), { status: 'invalid', code: 'invalid_food' }],
    ['invalid date', { ...input([{ name: 'Riz', calories: 80 }]), targetDate: '2026-02-30' }, { status: 'invalid', code: 'invalid_date' }],
    ['missing meal type', { ...input([{ name: 'Riz', calories: 80 }]), targetMealType: '' }, { status: 'invalid', code: 'missing_meal_type' }],
  ])('fails closed for %s', (_, value, expected) => {
    expect(prepareSavedMealReuse(value)).toEqual(expected)
  })

  it('writes the complete ordered batch once', async () => {
    const prepared = prepareSavedMealReuse(input([
      { name: 'Premier', calories: 80 },
      { name: 'Second', calories: 120 },
    ]))
    expect(prepared.status).toBe('ready')
    if (prepared.status !== 'ready') return
    const insertBatch = vi.fn().mockResolvedValue({ error: null })
    await expect(persistSavedMealReuse(prepared, insertBatch)).resolves.toEqual({
      status: 'succeeded',
      insertedCount: 2,
    })
    expect(insertBatch).toHaveBeenCalledOnce()
    expect(insertBatch.mock.calls[0][0].map((item: { readonly custom_name?: string | null }) => item.custom_name))
      .toEqual(['Premier', 'Second'])
  })

  it('reports a first-call batch failure without leaking SQL details', async () => {
    const prepared = prepareSavedMealReuse(input([{ name: 'Riz', calories: 80 }]))
    if (prepared.status !== 'ready') throw new Error('fixture must be ready')
    const insertBatch = vi.fn().mockResolvedValue({
      error: { message: 'owner@example.test duplicate key' },
    })
    await expect(persistSavedMealReuse(prepared, insertBatch)).resolves.toEqual({
      status: 'write_failed',
      insertedCount: 0,
    })
    expect(savedMealReuseMessage('write_failed')).toBe(SAVED_MEAL_REUSE_WRITE_ERROR_MESSAGE)
    expect(SAVED_MEAL_REUSE_WRITE_ERROR_MESSAGE).not.toContain('owner@example.test')
  })

  it('makes the historical second-insert failure impossible within this boundary', async () => {
    const prepared = prepareSavedMealReuse(input([
      { name: 'Premier', calories: 80 },
      { name: 'Second', calories: 120 },
    ]))
    if (prepared.status !== 'ready') throw new Error('fixture must be ready')
    const insertBatch = vi.fn().mockResolvedValue({ error: { code: 'bounded' } })
    await persistSavedMealReuse(prepared, insertBatch)
    expect(insertBatch).toHaveBeenCalledOnce()
  })

  it('uses a stable conflict message without values or paths', () => {
    const result = prepareSavedMealReuse(input([{
      name: 'Conflit',
      calories: 80,
      protein: 7,
      proteins: 8,
    }]))
    if (result.status !== 'alias_conflict') throw new Error('fixture must conflict')
    expect(savedMealReuseMessage(result)).toBe(SAVED_MEAL_REUSE_CONFLICT_MESSAGE)
    expect(SAVED_MEAL_REUSE_CONFLICT_MESSAGE).not.toMatch(/protein|7|8|foods\./i)
  })

  it('allows a retry after the aliases are corrected', () => {
    const conflicting = input([{
      name: 'Conflit',
      calories: 80,
      protein: 7,
      proteins: 8,
    }])
    expect(prepareSavedMealReuse(conflicting).status).toBe('alias_conflict')
    expect(prepareSavedMealReuse(input([{
      name: 'Corrigé',
      calories: 80,
      protein: 7,
      proteins: 7,
    }]))).toMatchObject({ status: 'ready', inserts: [{ protein: 7 }] })
  })
})
