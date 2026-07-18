import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NutritionCalendarSection } from '@/app/components/tabs/nutrition/NutritionCalendarSection'
import { NutritionPlanSection } from '@/app/components/tabs/nutrition/NutritionPlanSection'
import { NutritionSavedMealsSection } from '@/app/components/tabs/nutrition/NutritionSavedMealsSection'
import { NutritionSummarySection } from '@/app/components/tabs/nutrition/NutritionSummarySection'

describe('NutritionTab extracted section rendering', () => {
  it('renders journal calendar dates, past context and meal markers', () => {
    const html = renderToStaticMarkup(createElement(NutritionCalendarSection, { calendarDays: ['2026-07-17', '2026-07-18', '2026-07-19'], selectedDate: '2026-07-17', today: '2026-07-18', daysWithMeals: new Set(['2026-07-17']), locale: 'fr', scrollRef: createRef<HTMLDivElement>(), todayLabel: 'Aujourd’hui', futureDateLabel: 'Date future', onSelectDate: vi.fn() }))
    expect(html).toContain('Aujourd’hui')
    expect(html).toContain('Précédent')
    expect(html).toContain('Date future')
  })

  it('preserves explicit zero values in calories, water and macros', () => {
    const html = renderToStaticMarkup(createElement(NutritionSummarySection, { consumed: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, targets: { kcal: 2000, protein: 140, carbs: 220, fat: 60 }, waterMl: 0, waterGoalMl: 3000, canAddWater: true, remainingLabel: '2000 restantes', macroLabels: { protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides' }, water250Label: 'Ajouter 250 ml', water500Label: 'Ajouter 500 ml', onAddWater: vi.fn() }))
    expect(html).toContain('>0</span>')
    expect(html).toContain('/ 2000 kcal')
    expect(html).toContain('0.0L')
    expect(html).toContain('>0<span')
    expect(html).toContain('/140g')
  })

  it('renders loading, empty, personal and coach plan states exclusively', () => {
    const props = { active: true, emptyView: createElement('span', null, 'PLAN_EMPTY'), personalPlanView: createElement('span', null, 'PERSONAL_PLAN'), coachPlanView: createElement('span', null, 'COACH_PLAN') }
    expect(renderToStaticMarkup(createElement(NutritionPlanSection, { ...props, loading: true, hasPersonalPlan: false, hasCoachPlan: false }))).toContain('skeleton')
    expect(renderToStaticMarkup(createElement(NutritionPlanSection, { ...props, loading: false, hasPersonalPlan: false, hasCoachPlan: false }))).toContain('PLAN_EMPTY')
    const personal = renderToStaticMarkup(createElement(NutritionPlanSection, { ...props, loading: false, hasPersonalPlan: true, hasCoachPlan: true }))
    expect(personal).toContain('PERSONAL_PLAN')
    expect(personal).not.toContain('COACH_PLAN')
  })

  it('renders saved-meal empty and populated states', () => {
    const props = { search: '', filter: 'all', locale: 'fr', labels: { title: 'Mes repas', search: 'Rechercher', all: 'Tous', breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation', empty: 'Aucun repas', create: 'Créer un repas' }, mealLabels: { dejeuner: 'Déjeuner' }, confirmDeleteId: null, onSearchChange: vi.fn(), onFilterChange: vi.fn(), onEdit: vi.fn(), onAskDelete: vi.fn(), onDelete: vi.fn(), onCreate: vi.fn() }
    expect(renderToStaticMarkup(createElement(NutritionSavedMealsSection, { ...props, meals: [] }))).toContain('Aucun repas')
    const html = renderToStaticMarkup(createElement(NutritionSavedMealsSection, { ...props, meals: [{ id: 'meal-1', name: 'Repas test', meal_type: 'dejeuner', foods: [{ calories: 500, protein: 30, carbs: 50, fat: 15 }] }] }))
    expect(html).toContain('Repas test')
    expect(html).toContain('500 kcal')
  })
})
