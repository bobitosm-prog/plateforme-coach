import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { MEAL_CONTEXT_OPTIONS } from '@/app/components/nutrition-v2/MealContextChooser'
import { resolveNutritionNextAction } from '@/app/components/nutrition-v2/TodayMeals'
import { buildNutritionViewModel } from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'

const tab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const chooser = readFileSync('app/components/nutrition-v2/MealContextChooser.tsx', 'utf8')
const foodSearch = readFileSync('app/components/FoodSearch.tsx', 'utf8')
const todayMeals = readFileSync('app/components/nutrition-v2/TodayMeals.tsx', 'utf8')
const styles = readFileSync('app/components/nutrition-v2/NutritionV2.module.css', 'utf8')
const french = JSON.parse(readFileSync('messages/fr.json', 'utf8'))
const english = JSON.parse(readFileSync('messages/en.json', 'utf8'))
const german = JSON.parse(readFileSync('messages/de.json', 'utf8'))
const day = getNutritionDayWindow(new Date('2026-08-30T12:00:00.000Z'))

describe('Nutrition global Add Meal context', () => {
  it('requires an explicit selection across the canonical four meals', () => {
    expect(MEAL_CONTEXT_OPTIONS).toEqual([
      { key: 'breakfast', value: 'petit_dejeuner' },
      { key: 'lunch', value: 'dejeuner' },
      { key: 'snack', value: 'collation' },
      { key: 'dinner', value: 'diner' },
    ])
    expect(tab).toContain("setPendingMealAction('food')")
    expect(tab).not.toContain("onAddMeal={() => {\n        setSubTab('today')\n        setShowFoodSearch('dejeuner')")
  })

  it('does not silently default the first-meal action or FoodSearch writes', () => {
    const model = buildNutritionViewModel({
      day,
      week: getNutritionWeekWindow(day.date),
      selectedDate: day.localDateKey,
      profile: {},
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
      coachRelation: { status: 'not_found', coachId: null },
      dailyLogs: [],
      tracking: [],
      personalPlan: null,
      coachPlan: null,
      hydration: [],
    })
    expect(resolveNutritionNextAction({ model, selectedDate: day.localDateKey, hour: 9 }))
      .toEqual({ kind: 'add_first', mealType: null })
    expect(todayMeals).toContain("if (nextAction.kind === 'add_first') return onChooseMeal()")
    expect(foodSearch).toContain('defaultMealType: string')
    expect(foodSearch).toContain('useState(defaultMealType)')
    expect(foodSearch).not.toContain("defaultMealType || 'dejeuner'")
  })

  it('propagates breakfast, lunch, snack, and dinner to the write path', () => {
    expect(tab).toContain('setShowFoodSearch(mealType)')
    expect(foodSearch).toContain('meal_type: mealType')
    for (const value of ['petit_dejeuner', 'dejeuner', 'collation', 'diner']) {
      expect(MEAL_CONTEXT_OPTIONS.some(option => option.value === value)).toBe(true)
    }
  })

  it('keeps existing row actions contextual and propagates photo context', () => {
    expect(tab).toContain('onAddFood={mealType => setShowFoodSearch(NUTRITION_MEAL_TO_KEY[mealType])}')
    expect(tab).toContain('setPhotoMealTarget(mealType)')
    expect(tab).toContain("setPendingMealAction('photo')")
    expect(todayMeals).toContain('onAddFood(type)')
  })

  it('preserves edit/delete meal context and calorie aggregation', () => {
    expect(tab).toContain('const updated = { quantity_g: newQty')
    expect(tab).toContain("from('daily_food_logs').update(updated).eq('id', id)")
    expect(tab).toContain("from('daily_food_logs').delete().eq('id', id)")
    expect(tab).not.toMatch(/update\(\{[^}]*meal_type/)

    const model = buildNutritionViewModel({
      day,
      week: getNutritionWeekWindow(day.date),
      selectedDate: day.localDateKey,
      profile: {},
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
      coachRelation: { status: 'not_found', coachId: null },
      dailyLogs: [
        { id: 'a', date: day.localDateKey, meal_type: 'breakfast', calories: 200 },
        { id: 'b', date: day.localDateKey, meal_type: 'dinner', calories: 600 },
      ],
      tracking: [],
      personalPlan: null,
      coachPlan: null,
      hydration: [],
    })
    expect(model.consumed.data?.calories).toBe(800)
  })

  it('is compact, keyboard-safe, and translated in FR/EN/DE', () => {
    expect(chooser).toContain('role="dialog"')
    expect(chooser).toContain('aria-modal="true"')
    expect(chooser).toContain("event.key === 'Escape'")
    expect(styles).toMatch(/\.mealChooserGrid button\s*\{[\s\S]*?min-height:\s*52px/)
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(french.nutrition_tab.v2.mealChooser.breakfast).toBe('Petit-déjeuner')
    expect(english.nutrition_tab.v2.mealChooser.lunch).toBe('Lunch')
    expect(german.nutrition_tab.v2.mealChooser.dinner).toBe('Abendessen')
  })
})
