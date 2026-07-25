import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NutritionJournalMealsSection } from '@/app/components/tabs/nutrition/NutritionJournalMealsSection'
import { NutritionSummarySection } from '@/app/components/tabs/nutrition/NutritionSummarySection'

const baseProps = {
  waterMl: 0,
  waterGoalMl: 3000,
  canAddWater: true,
  remainingLabel: 'Données indisponibles',
  macroLabels: {
    protein: 'Protéines',
    carbs: 'Glucides',
    fat: 'Lipides',
  },
  water250Label: 'Ajouter 250 ml',
  water500Label: 'Ajouter 500 ml',
  onAddWater: vi.fn(),
}

describe('NutritionTab C05 summary rendering', () => {
  it('preserves valid values and progress rendering', () => {
    const html = renderToStaticMarkup(createElement(NutritionSummarySection, {
      ...baseProps,
      consumed: { kcal: 1810, protein: 133, carbs: 203, fat: 49 },
      targets: { kcal: 2283, protein: 134, carbs: 266, fat: 76 },
      remainingLabel: 'restantes : 473',
    }))
    expect(html).toContain('>1810</span>')
    expect(html).toContain('/ 2283 kcal')
    expect(html).toContain('>133<span')
    expect(html).toContain('/134g')
    expect(html).toContain('restantes : 473')
  })

  it('renders unknown consumption and missing goals explicitly without progress', () => {
    const html = renderToStaticMarkup(createElement(NutritionSummarySection, {
      ...baseProps,
      consumed: { kcal: null, protein: null, carbs: 0, fat: null },
      targets: { kcal: null, protein: null, carbs: 0, fat: null },
    }))
    expect(html).toContain('>—</span>')
    expect(html).toContain('/—')
    expect(html).not.toContain('width:0%')
    expect(html).not.toContain('stroke-dashoffset:0')
  })

  it('renders an unknown journal macro as a gap without hiding known values', () => {
    const html = renderToStaticMarkup(createElement(
      NutritionJournalMealsSection,
      {
        mealOrder: ['dejeuner'],
        mealLabels: { dejeuner: 'Déjeuner' },
        mealIcons: {},
        logs: [{
          id: 'log-1',
          meal_type: 'dejeuner',
          custom_name: 'Riz',
          quantity_g: 100,
          calories: 300,
          protein: null,
          carbs: 60,
          fat: 2,
        }],
        recommendations: {},
        selectedPlanDay: 'lundi',
        todayPlanDay: 'lundi',
        isInvited: false,
        openMenu: null,
        editingFoodId: null,
        editQuantity: '',
        labels: {
          noFood: 'Aucun aliment',
          recommended: () => 'Recommandé',
          consumed: values => `P:${values.protein}`,
          save: 'Sauver',
          copy: 'Copier',
          clear: 'Vider',
          replace: 'Remplacer',
          remove: 'Supprimer',
          import: 'Importer',
          add: 'Ajouter',
          todayOnly: 'Aujourd’hui',
        },
        onOpenMenu: vi.fn(),
        onStartSave: vi.fn(),
        onStartCopy: vi.fn(),
        onClear: vi.fn(),
        onStartEditQuantity: vi.fn(),
        onEditQuantity: vi.fn(),
        onSaveQuantity: vi.fn(),
        onCancelQuantity: vi.fn(),
        onReplace: vi.fn(),
        onDelete: vi.fn(),
        onImport: vi.fn(),
        onAdd: vi.fn(),
        onPhoto: vi.fn(),
        onSavedMeals: vi.fn(),
      },
    ))
    expect(html).toContain('300 kcal')
    expect(html).toContain('P:—g')
    expect(html).toContain('G:60g')
    expect(html).toContain('P:null')
  })
})
