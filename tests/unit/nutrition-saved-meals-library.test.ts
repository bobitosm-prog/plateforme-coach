import { describe, expect, it } from 'vitest'

import {
  beginSavedMealsLibraryRead,
  createEmptySavedMealsLibrary,
  replaceSavedMealsLibraryMeals,
  settleSavedMealsLibraryRead,
} from '@/lib/nutrition/saved-meals-library'

const owner = 'owner-1'
const historicalMeal = {
  id: 'meal-old',
  user_id: owner,
  name: 'Repas historique',
  meal_type: 'diner',
  foods: [{
    name: 'Aliment historique',
    calories: 420,
    proteins: 30,
    carbs: 45,
    fats: 12,
  }],
  created_at: '2026-07-01T12:00:00.000Z',
}
const recentMeal = {
  id: 'meal-new',
  user_id: owner,
  name: 'Repas récent',
  meal_type: 'dejeuner',
  foods: [],
  created_at: '2026-07-20T12:00:00.000Z',
}
type TestMeal = {
  id: string
  user_id: string
  name: string
  meal_type: string
  foods: readonly Record<string, unknown>[]
  created_at: string
}
const emptyLibrary = () => createEmptySavedMealsLibrary<TestMeal>()

describe('C06 Mes repas library settlement', () => {
  it('represents the first load explicitly', () => {
    expect(beginSavedMealsLibraryRead(
      emptyLibrary(),
      owner,
    )).toEqual({
      status: 'loading',
      ownerUserId: owner,
      meals: [],
    })
  })

  it('distinguishes a successful empty collection', () => {
    const loading = beginSavedMealsLibraryRead(
      emptyLibrary(),
      owner,
    )
    expect(settleSavedMealsLibraryRead(
      loading,
      { data: [], error: null },
      owner,
      true,
    )).toEqual({
      status: 'empty',
      ownerUserId: owner,
      meals: [],
    })
  })

  it('preserves one historical meal including plural food aliases', () => {
    const result = settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      { data: [historicalMeal], error: null },
      owner,
      true,
    )
    expect(result).toEqual({
      status: 'ready',
      ownerUserId: owner,
      meals: [historicalMeal],
    })
    expect(result.meals[0]?.foods[0]).toMatchObject({
      proteins: 30,
      fats: 12,
    })
  })

  it('preserves the descending order returned by PostgREST', () => {
    const result = settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      { data: [recentMeal, historicalMeal], error: null },
      owner,
      true,
    )
    expect(result.meals.map(meal => meal.id)).toEqual(['meal-new', 'meal-old'])
  })

  it.each([
    ['Supabase error', { code: '42501' }],
    ['network rejection', new TypeError('network unavailable')],
  ])('keeps a first %s distinct from an empty list', (_, error) => {
    expect(settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      { data: null, error },
      owner,
      true,
    )).toEqual({
      status: 'error',
      ownerUserId: owner,
      meals: [],
    })
  })

  it('treats null data without an error as an invalid read, not empty success', () => {
    expect(settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      { data: null, error: null },
      owner,
      true,
    )).toEqual({
      status: 'error',
      ownerUserId: owner,
      meals: [],
    })
  })

  it('preserves a visible list after an error', () => {
    const ready = settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      { data: [historicalMeal], error: null },
      owner,
      true,
    )
    expect(settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(ready, owner),
      { data: null, error: { code: '500' } },
      owner,
      true,
    )).toEqual({
      status: 'error',
      ownerUserId: owner,
      meals: [historicalMeal],
    })
  })

  it('ignores an obsolete response', () => {
    const loading = beginSavedMealsLibraryRead(
      emptyLibrary(),
      owner,
    )
    expect(settleSavedMealsLibraryRead(
      loading,
      { data: [historicalMeal], error: null },
      owner,
      false,
    )).toBe(loading)
  })

  it('clears the visible list immediately when the owner changes', () => {
    const previous = {
      status: 'ready' as const,
      ownerUserId: owner,
      meals: [historicalMeal],
    }
    expect(beginSavedMealsLibraryRead(previous, 'owner-2')).toEqual({
      status: 'loading',
      ownerUserId: 'owner-2',
      meals: [],
    })
  })

  it('recovers when the tab is reopened after an error', () => {
    const failed = {
      status: 'error' as const,
      ownerUserId: owner,
      meals: [historicalMeal],
    }
    const loading = beginSavedMealsLibraryRead(failed, owner)
    expect(loading).toEqual({
      status: 'loading',
      ownerUserId: owner,
      meals: [historicalMeal],
    })
    expect(settleSavedMealsLibraryRead(
      loading,
      { data: [recentMeal], error: null },
      owner,
      true,
    )).toEqual({
      status: 'ready',
      ownerUserId: owner,
      meals: [recentMeal],
    })
  })

  it('rejects a row owned by another user', () => {
    expect(settleSavedMealsLibraryRead(
      beginSavedMealsLibraryRead(emptyLibrary(), owner),
      {
        data: [{ ...historicalMeal, user_id: 'owner-2' }],
        error: null,
      },
      owner,
      true,
    )).toEqual({
      status: 'error',
      ownerUserId: owner,
      meals: [],
    })
  })

  it('keeps existing optimistic create/edit/delete state updates explicit', () => {
    const ready = {
      status: 'ready' as const,
      ownerUserId: owner,
      meals: [historicalMeal],
    }
    const appended = replaceSavedMealsLibraryMeals(
      ready,
      previous => [recentMeal, ...previous],
    )
    expect(appended.meals.map(meal => meal.id)).toEqual([
      'meal-new',
      'meal-old',
    ])
    expect(replaceSavedMealsLibraryMeals(
      appended,
      previous => previous.filter(meal => meal.id !== 'meal-old'),
    )).toMatchObject({
      status: 'ready',
      meals: [recentMeal],
    })
  })
})
