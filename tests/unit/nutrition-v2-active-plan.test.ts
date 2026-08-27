import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildNutritionViewModel,
  resolveActiveNutritionPlan,
  type NutritionViewModelInput,
} from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'

const component = readFileSync('app/components/nutrition-v2/ActiveNutritionPlan.tsx', 'utf8')
const tab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const hook = readFileSync('app/hooks/useNutritionDashboardModel.ts', 'utf8')
const relationRepository = readFileSync('lib/coach-relations/repository.ts', 'utf8')
const styles = readFileSync('app/components/nutrition-v2/NutritionV2.module.css', 'utf8')
const messages = readFileSync('messages/fr.json', 'utf8')

const day = getNutritionDayWindow(new Date('2026-08-24T12:00:00.000Z'))
const personalPlan = {
  id: 'personal-plan',
  active: true,
  created_at: '2026-08-20T10:00:00.000Z',
  plan: {
    lundi: {
      repas: {
        petit_dejeuner: [{ name: 'Avoine', qty: 80, kcal: 300, prot: 15, carb: 45, fat: 7 }],
      },
    },
  },
}
const coachPlan = {
  id: 'coach-plan',
  coach_id: 'coach-1',
  created_at: '2026-08-21T10:00:00.000Z',
  updated_at: '2026-08-24T10:00:00.000Z',
  plan: {
    lundi: {
      meals: [{ type: 'Petit-déjeuner', foods: [{ name: 'Œufs', qty: 120, kcal: 210, prot: 18, carb: 2, fat: 14 }] }],
    },
  },
}

function input(overrides: Partial<NutritionViewModelInput> = {}): NutritionViewModelInput {
  return {
    day,
    week: getNutritionWeekWindow(day.date),
    selectedDate: day.localDateKey,
    profile: { calorie_goal: 2_000, protein_goal: 150, carbs_goal: 220, fat_goal: 65 },
    capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
    coachRelation: { status: 'not_found', coachId: null },
    dailyLogs: [],
    tracking: [],
    personalPlan,
    coachPlan: null,
    hydration: [],
    ...overrides,
  }
}

describe('Nutrition V2 active plan authority', () => {
  it('selects a matching coach plan only for the active coach', () => {
    const active = resolveActiveNutritionPlan({
      coachRelationStatus: 'active',
      coachId: 'coach-1',
      coachMealPlan: coachPlan,
      personalMealPlan: personalPlan,
    })
    expect(active.source).toBe('coach')
    expect(active.updatedAt).toBe(coachPlan.updated_at)
  })

  it.each(['not_found', 'multiple_active', 'error'] as const)('rejects a stale coach plan for %s', status => {
    const active = resolveActiveNutritionPlan({
      coachRelationStatus: status,
      coachId: null,
      coachMealPlan: coachPlan,
      personalMealPlan: personalPlan,
    })
    expect(active.source).toBe('personal')
    expect(active.coachId).toBeNull()
  })

  it('treats an ended relation as not_found through the active-only repository', () => {
    expect(relationRepository).toContain(".eq('status', 'active')")
    const active = resolveActiveNutritionPlan({
      coachRelationStatus: 'not_found',
      coachId: null,
      coachMealPlan: coachPlan,
      personalMealPlan: personalPlan,
    })
    expect(active.source).toBe('personal')
  })

  it('falls back to one personal plan and never merges plan payloads', () => {
    const active = resolveActiveNutritionPlan({
      coachRelationStatus: 'active',
      coachId: 'coach-2',
      coachMealPlan: coachPlan,
      personalMealPlan: personalPlan,
    })
    expect(active.source).toBe('personal')
    expect(active.plan).toBe(personalPlan.plan)
    expect(active.plan).not.toBe(coachPlan.plan)
  })

  it('uses partial for a personal fallback when relation verification fails', () => {
    const model = buildNutritionViewModel(input({ coachRelation: { status: 'error', coachId: null }, coachPlan }))
    expect(model.activePlan.state).toBe('partial')
    expect(model.activePlan.source).toBe('personal')
    expect(model.activePlan.plan).toBe(personalPlan.plan)
  })

  it('keeps coach read errors explicit without masking the journal', () => {
    const model = buildNutritionViewModel(input({
      coachRelation: { status: 'active', coachId: 'coach-1' },
      personalPlan,
      dailyLogs: [{ id: 'log', date: day.localDateKey, meal_type: 'breakfast', calories: 300 }],
      errors: { coachPlan: 'NUTRITION_COACH_PLAN_READ_FAILED' },
    }))
    expect(model.activePlan.state).toBe('error')
    expect(model.meals.state).toBe('partial')
    expect(model.meals.data?.[0].logged).toHaveLength(1)
  })

  it('distinguishes personal plan errors from an empty plan', () => {
    expect(buildNutritionViewModel(input({ personalPlan: null })).activePlan.state).toBe('empty')
    expect(buildNutritionViewModel(input({ personalPlan: null, errors: { personalPlan: 'READ_FAILED' } })).activePlan.state).toBe('error')
  })
})

describe('Nutrition V2 active plan UI contract', () => {
  it('uses a single active plan representation with explicit source labels', () => {
    expect(tab).toContain('<ActiveNutritionPlan')
    expect(tab).not.toContain('renderAiPlan')
    expect(tab).not.toContain('renderCoachPlan')
    expect(messages).toContain('"coachSource": "Plan coach"')
    expect(messages).toContain('"personalSource": "Plan personnel"')
  })

  it('prioritizes today and keeps only one selected day and meal detail open', () => {
    expect(component).toContain('availableDays.includes(todayKey as Day)')
    expect(component).toContain('aria-pressed={selectedDay === day}')
    expect(component).toContain('aria-expanded={detailsOpen}')
    expect(component).toContain('aria-expanded={expanded}')
    expect(component).toContain('setExpandedMeal(expanded ? null : mealKey)')
    expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
  })

  it('is consultation-only and contains no generation authority', () => {
    expect(component).not.toMatch(/generate-meal-plan|regenerate|durationWeeks|NutritionPreferences|supabase|fetch\(/i)
    expect(component).toContain("t('viewPlan')")
    expect(component).toContain("t('shoppingList')")
  })

  it('keeps shopping list secondary to the active plan and removes the journal duplicate', () => {
    expect(component).toContain('onOpenShoppingList')
    expect(tab.match(/setShowShoppingModal\(true\)/g)).toHaveLength(1)
  })

  it('uses the existing journal import and introduces no permanent read', () => {
    expect(component).toContain('onImportMeal(mealKey, selectedDay)')
    expect(tab).toContain("supabase.from('daily_food_logs').insert(inserts)")
    expect(tab).not.toContain("supabase.from('meal_tracking').insert")
    expect(component).not.toContain('.from(')
    expect(hook.match(/\.from\('meal_plans'\)/g)).toHaveLength(1)
    expect(hook.match(/\.from\('client_meal_plans'\)/g)).toHaveLength(1)
  })

  it('preserves consumption exactly once after import and tracking completion', () => {
    const model = buildNutritionViewModel(input({
      dailyLogs: [{ id: 'imported', date: day.localDateKey, meal_type: 'breakfast', calories: 300, protein: 15, carbs: 45, fat: 7 }],
      tracking: [{ date: day.localDateKey, meal_type: 'breakfast', completed: true }],
    }))
    expect(model.consumed.data).toEqual({ calories: 300, protein: 15, carbs: 45, fat: 7 })
    expect(model.meals.data?.[0].completed).toBe(true)
  })
})
