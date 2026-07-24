import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  NutritionSavedMealsSection,
  type NutritionSavedMealView,
} from '@/app/components/tabs/nutrition/NutritionSavedMealsSection'
import { SavedMealSelectionList } from '@/app/components/tabs/nutrition/NutritionTabOverlays'
import {
  beginSavedMealSelection,
  createEmptySavedMealSelection,
  settleSavedMealSelection,
} from '@/lib/nutrition/saved-meal-selection'

const REAL_SHAPE_LEGACY_MEAL = {
  id: 'saved-meal-anonymized',
  user_id: 'owner-id',
  name: 'Repas historique',
  meal_type: 'diner',
  foods: [{
    name: 'Aliment historique A',
    quantity: 100,
    calories: 250,
    proteins: 18,
    carbs: 30,
    fats: 7,
  }, {
    name: 'Aliment historique B',
    quantity: 100,
    calories: 170,
    proteins: 12,
    carbs: 15,
    fats: 5,
  }],
  total_calories: 420,
  total_protein: 30,
  total_carbs: 45,
  total_fat: 12,
  created_at: '2026-07-01T12:00:00.000Z',
}

describe('saved meal import selection', () => {
  it('keeps the same owner meal visible in Mes repas and in the import selection', () => {
    const selection = settleSavedMealSelection(
      createEmptySavedMealSelection<typeof REAL_SHAPE_LEGACY_MEAL>(),
      { data: [REAL_SHAPE_LEGACY_MEAL], error: null },
      true,
    )
    expect(selection).toEqual({
      status: 'ready',
      meals: [REAL_SHAPE_LEGACY_MEAL],
    })

    const props = {
      meals: [...selection.meals] as NutritionSavedMealView[],
      search: '',
      filter: 'all',
      locale: 'fr',
      labels: {
        title: 'Mes repas',
        search: 'Rechercher',
        all: 'Tous',
        breakfast: 'Petit-déjeuner',
        lunch: 'Déjeuner',
        dinner: 'Dîner',
        snack: 'Collation',
        empty: 'Aucun repas',
        create: 'Créer',
      },
      mealLabels: { diner: 'Dîner' },
      confirmDeleteId: null,
      onSearchChange: vi.fn(),
      onFilterChange: vi.fn(),
      onEdit: vi.fn(),
      onAskDelete: vi.fn(),
      onDelete: vi.fn(),
      onCreate: vi.fn(),
    }
    const html = renderToStaticMarkup(createElement(NutritionSavedMealsSection, props))
    expect(html).toContain('Repas historique')
    expect(selection.meals[0]?.id).toBe(REAL_SHAPE_LEGACY_MEAL.id)

    const importHtml = renderToStaticMarkup(createElement(SavedMealSelectionList, {
      meals: selection.meals,
      error: null,
      loading: false,
      emptyLabel: 'Aucun repas à importer',
      countLabel: count => `${count} aliment`,
      reusing: false,
      onApply: vi.fn(),
    }))
    expect(importHtml).toContain('Repas historique')
    expect(importHtml).toContain('420')
    expect(importHtml).toContain('2 aliment')
    expect(importHtml).not.toContain('Aucun repas à importer')
  })

  it('does not present a read error as a valid empty list', () => {
    const previous = {
      status: 'ready',
      meals: [REAL_SHAPE_LEGACY_MEAL],
    } as const
    expect(settleSavedMealSelection(
      beginSavedMealSelection(previous),
      { data: null, error: { code: '42703' } },
      true,
    )).toEqual({
      status: 'error',
      meals: [REAL_SHAPE_LEGACY_MEAL],
    })
    expect(settleSavedMealSelection(
      createEmptySavedMealSelection(),
      { data: null, error: { code: '42703' } },
      true,
    )).toEqual({ status: 'error', meals: [] })

    const errorHtml = renderToStaticMarkup(createElement(SavedMealSelectionList, {
      meals: [],
      error: 'Lecture impossible',
      loading: false,
      emptyLabel: 'Aucun repas à importer',
      countLabel: count => `${count} aliment`,
      reusing: false,
      onApply: vi.fn(),
    }))
    expect(errorHtml).toContain('role="alert"')
    expect(errorHtml).toContain('Lecture impossible')
    expect(errorHtml).not.toContain('Aucun repas à importer')
  })

  it('does not let an obsolete response erase a valid selection', () => {
    const ready = settleSavedMealSelection(
      createEmptySavedMealSelection<typeof REAL_SHAPE_LEGACY_MEAL>(),
      { data: [REAL_SHAPE_LEGACY_MEAL], error: null },
      true,
    )
    expect(settleSavedMealSelection(
      ready,
      { data: [], error: null },
      false,
    )).toBe(ready)
  })
})
