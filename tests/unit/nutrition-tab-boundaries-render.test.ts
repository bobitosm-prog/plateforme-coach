import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NutritionJournalMealsSection } from '@/app/components/tabs/nutrition/NutritionJournalMealsSection'
import { NutritionPlanContent } from '@/app/components/tabs/nutrition/NutritionPlanContent'
import {
  NutritionTabOverlays,
  SavedMealWriteAlert,
} from '@/app/components/tabs/nutrition/NutritionTabOverlays'

const labels = { noFood: 'VIDE', recommended: () => 'RECOMMANDÉ', consumed: () => 'CONSOMMÉ', save: 'SAUVER', copy: 'COPIER', clear: 'VIDER', replace: 'REMPLACER', remove: 'SUPPRIMER', import: 'IMPORTER', add: 'AJOUTER', todayOnly: 'AUJOURD’HUI' }

describe('NutritionTab extracted boundaries rendering', () => {
  it('renders empty journal and keeps add callback wiring', () => {
    const onAdd = vi.fn()
    const html = renderToStaticMarkup(createElement(NutritionJournalMealsSection, { mealOrder: ['dejeuner'], mealLabels: { dejeuner: 'Déjeuner' }, mealIcons: {}, logs: [], recommendations: {}, selectedPlanDay: 'lundi', todayPlanDay: 'lundi', isInvited: false, openMenu: null, editingFoodId: null, editQuantity: '', labels, onOpenMenu: vi.fn(), onStartSave: vi.fn(), onStartCopy: vi.fn(), onClear: vi.fn(), onStartEditQuantity: vi.fn(), onEditQuantity: vi.fn(), onSaveQuantity: vi.fn(), onCancelQuantity: vi.fn(), onReplace: vi.fn(), onDelete: vi.fn(), onImport: vi.fn(), onAdd, onPhoto: vi.fn(), onSavedMeals: vi.fn() }))
    expect(html).toContain('VIDE')
    expect(html).toContain('AJOUTER')
  })

  it('renders plan empty-day and populated legacy data', () => {
    const common = { mode: 'personal' as const, plan: {}, selectedDay: 'lundi', todayKey: 'lundi', locale: 'fr', labels: { kcal: 'Kcal', protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides', noDay: 'AUCUN JOUR', noMeals: 'AUCUN REPAS', shopping: 'COURSES', breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', snack: 'Collation', dinner: 'Dîner' }, onSelectDay: vi.fn(), onShopping: vi.fn() }
    expect(renderToStaticMarkup(createElement(NutritionPlanContent, { ...common, planData: {} }))).toContain('AUCUN JOUR')
    const html = renderToStaticMarkup(createElement(NutritionPlanContent, { ...common, planData: { lundi: { repas: { dejeuner: [{ aliment: 'Riz', calories: 100, proteines: 2, glucides: 20, lipides: 1 }] } } } }))
    expect(html).toContain('Riz')
    expect(html).toContain('COURSES')
  })

  it('keeps overlay rendering server-safe when the portal is unavailable', () => {
    const props = { editingMeal: null, editQuery: '', editResults: [], editSaving: false, editSaved: false, savedMealError: null, savedMealLoadError: null, savedMealLoading: false, saveMealSaving: false, savedMealReusing: false, photoOpen: false, analyzingPhoto: false, photoResult: null, saveOpen: false, saveFoods: [], saveName: '', copyOpen: false, copyDate: '', copyMealType: '', today: '2026-07-18', mealOrder: [], mealLabels: {}, savedOpen: true, savedMeals: [], labels: { editFallback: 'Modifier', save: 'Sauver', saving: 'Sauvegarde', saved: 'Sauvé', deleteMeal: 'Supprimer', scan: 'Scanner', takePhoto: 'Photo', gallery: 'Galerie', retake: 'Reprendre', addAll: 'Ajouter', saveTitle: 'Sauver', savePlaceholder: 'Nom', saveCount: (count: number) => String(count), cancel: 'Annuler', copyTitle: 'Copier', copyDate: 'Date', copyMeal: 'Repas', copy: 'Copier', savedTitle: 'MES REPAS', savedEmpty: 'AUCUN REPAS', savedCount: (count: number) => String(count), shortcuts: [] }, onCloseEdit: vi.fn(), onEditFood: vi.fn(), onRemoveFood: vi.fn(), onEditQuery: vi.fn(), onAddFood: vi.fn(), onSaveEdit: vi.fn(), onDeleteEdit: vi.fn(), onPhotoChange: vi.fn(), onClosePhoto: vi.fn(), onRetake: vi.fn(), onAddPhoto: vi.fn(), onSaveName: vi.fn(), onCloseSave: vi.fn(), onSaveMeal: vi.fn(), onCopyDate: vi.fn(), onCopyMealType: vi.fn(), onCloseCopy: vi.fn(), onCopy: vi.fn(), onCloseSaved: vi.fn(), onApplySaved: vi.fn() }
    const html = renderToStaticMarkup(createElement(NutritionTabOverlays, props))
    expect(html).toBe('')
  })

  it('renders the saved-meal conflict as an accessible stable alert', () => {
    const html = renderToStaticMarkup(createElement(SavedMealWriteAlert, {
      message: 'Certaines valeurs nutritionnelles se contredisent.',
    }))
    expect(html).toContain('role="alert"')
    expect(html).toContain('Certaines valeurs nutritionnelles se contredisent.')
  })
})
