import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  getMealPrimaryAction,
  resolveNutritionNextAction,
} from '@/app/components/nutrition-v2/TodayMeals'
import {
  buildNutritionViewModel,
  type NutritionViewModelInput,
} from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'

const component = readFileSync('app/components/nutrition-v2/TodayMeals.tsx', 'utf8')
const styles = readFileSync('app/components/nutrition-v2/NutritionV2.module.css', 'utf8')
const tab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const day = getNutritionDayWindow(new Date('2026-08-26T12:00:00.000Z'))

const baseInput: NutritionViewModelInput = {
  day,
  week: getNutritionWeekWindow(day.date),
  selectedDate: day.localDateKey,
  profile: { calorie_goal: 2_100, protein_goal: 150, carbs_goal: 220, fat_goal: 70 },
  capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
  coachRelation: { status: 'not_found', coachId: null },
  dailyLogs: [],
  tracking: [],
  personalPlan: null,
  coachPlan: null,
  hydration: [],
}

const personalPlan = {
  id: 'plan',
  active: true,
  plan: {
    mercredi: {
      repas: {
        petit_dejeuner: [{ name: 'Porridge', qty: 200, kcal: 420, prot: 25, carb: 58, fat: 10 }],
        dejeuner: [{ name: 'Poulet et riz', qty: 350, kcal: 640, prot: 48, carb: 72, fat: 14 }],
      },
    },
  },
}

function model(overrides: Partial<NutritionViewModelInput> = {}) {
  return buildNutritionViewModel({ ...baseInput, ...overrides })
}

describe('Nutrition V2 Today Meals contract', () => {
  it('keeps the canonical four-meal order', () => {
    expect(model().meals.data?.map(meal => meal.type)).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
  })

  it('keeps planned food distinct from logged food and consumed totals', () => {
    const planned = model({ personalPlan })
    expect(planned.meals.data?.[0].status).toBe('planned')
    expect(planned.meals.data?.[0].planned).toHaveLength(1)
    expect(planned.meals.data?.[0].logged).toHaveLength(0)
    expect(planned.consumed.data?.calories).toBe(0)
  })

  it('distinguishes partial, logged, completed and empty statuses', () => {
    const partial = model({
      personalPlan,
      dailyLogs: [{ id: 'breakfast', date: day.localDateKey, meal_type: 'breakfast', calories: 210 }],
      tracking: [{ date: day.localDateKey, meal_type: 'dinner', completed: true }],
    })
    expect(partial.meals.data?.map(meal => meal.status)).toEqual([
      'partially_logged',
      'planned',
      'empty',
      'completed',
    ])

    const logged = model({
      dailyLogs: [{ id: 'lunch', date: day.localDateKey, meal_type: 'lunch', calories: 500 }],
    })
    expect(logged.meals.data?.[1].status).toBe('logged')
  })

  it('does not turn a daily log read failure into an empty meal list', () => {
    const failed = model({ errors: { dailyLogs: 'NUTRITION_DAILY_LOGS_READ_FAILED' } })
    expect(failed.meals.state).toBe('error')
    expect(failed.meals.data).toBeNull()
  })

  it('keeps valid logs usable when tracking or plan loading fails', () => {
    const trackingFailure = model({
      dailyLogs: [{ id: 'lunch', date: day.localDateKey, meal_type: 'lunch', calories: 500 }],
      errors: { tracking: 'NUTRITION_TRACKING_READ_FAILED' },
    })
    expect(trackingFailure.meals.state).toBe('partial')
    expect(trackingFailure.meals.data?.[1].logged).toHaveLength(1)
    expect(trackingFailure.consumed.data?.calories).toBe(500)
  })

  it('maps each status to one primary action', () => {
    expect(getMealPrimaryAction('empty')).toBe('add')
    expect(getMealPrimaryAction('planned')).toBe('log')
    expect(getMealPrimaryAction('partially_logged')).toBe('continue')
    expect(getMealPrimaryAction('logged')).toBe('view')
    expect(getMealPrimaryAction('completed')).toBe('view')
  })
})

describe('Nutrition V2 deterministic next action', () => {
  it('prioritizes a partial meal, then a planned meal', () => {
    const partial = model({
      personalPlan,
      dailyLogs: [{ id: 'breakfast', date: day.localDateKey, meal_type: 'breakfast', calories: 210 }],
    })
    expect(resolveNutritionNextAction({ model: partial, selectedDate: day.localDateKey, hour: 12 }))
      .toEqual({ kind: 'continue_partial', mealType: 'breakfast' })

    const planned = model({ personalPlan })
    expect(resolveNutritionNextAction({ model: planned, selectedDate: day.localDateKey, hour: 12 }))
      .toEqual({ kind: 'log_planned', mealType: 'breakfast' })
  })

  it('suggests a first meal without data and protein later in the day', () => {
    expect(resolveNutritionNextAction({ model: model(), selectedDate: day.localDateKey, hour: 9 }))
      .toEqual({ kind: 'add_first', mealType: 'breakfast' })

    const logged = model({
      dailyLogs: [{ id: 'lunch', date: day.localDateKey, meal_type: 'lunch', calories: 800, protein: 50 }],
    })
    expect(resolveNutritionNextAction({ model: logged, selectedDate: day.localDateKey, hour: 18 }))
      .toEqual({ kind: 'complete_protein', mealType: 'snack' })
  })

  it('uses historical and future-safe actions', () => {
    expect(resolveNutritionNextAction({ model: model(), selectedDate: '2026-08-25', hour: 12 }).kind).toBe('complete_day')
    expect(resolveNutritionNextAction({ model: model(), selectedDate: '2026-08-27', hour: 12 }))
      .toEqual({ kind: 'view_journal', mealType: null })
  })

  it('retries on read errors and never calls AI', () => {
    const failed = model({ errors: { dailyLogs: 'NUTRITION_DAILY_LOGS_READ_FAILED' } })
    expect(resolveNutritionNextAction({ model: failed, selectedDate: day.localDateKey, hour: 12 }).kind).toBe('retry')
    expect(component).not.toMatch(/fetch\(|generate-meal-plan|anthropic|openai|supabase/i)
  })
})

describe('Nutrition V2 compact journal integration', () => {
  it('keeps accordions closed by default and only one meal open', () => {
    expect(component).toContain('useState<NutritionMealType | null>(null)')
    expect(component).toContain('setOpenMeal(expanded ? null : type)')
    expect(component).toContain('aria-expanded={expanded}')
    expect(component).toContain('aria-controls={`nutrition-meal-${type}`}')
  })

  it('preserves legacy actions behind the expanded meal', () => {
    for (const action of ['onAddFood', 'onImportPlan', 'onPhoto', 'onSavedMeals', 'onSaveMeal', 'onCopyMeal', 'onClearMeal', 'onReplaceFood', 'onDeleteFood', 'onUpdateFood']) {
      expect(component).toContain(action)
    }
    expect(tab).toContain('<ImportPlanSheet')
    expect(tab).toContain('<FoodSearch')
  })

  it('removes the four large legacy cards and keeps compact responsive rows', () => {
    expect(tab).not.toContain('Meal sections — start empty')
    expect(tab).toContain('<TodayMeals')
    expect(styles).toContain('min-height: 68px')
    expect(styles).toContain('@media (max-width: 767px)')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).not.toContain('.todayMeals { overflow-x: auto')
  })

  it('keeps five visible actions in one fixed row and moves secondary actions into an accessible menu', () => {
    expect(component).toContain('className={styles.mealActionBar}')
    expect(component).toContain("t('compactEdit')")
    expect(component).toContain("t('savedMeals')")
    expect(component).toContain("t('compactSave')")
    expect(component).toContain("t('copyMeal')")
    expect(component).toContain("t('more')")
    expect(component).toContain('aria-haspopup="menu"')
    expect(component).toContain('aria-expanded={moreMenuMeal === type}')
    expect(component).toContain('role="menu"')
    expect(component).toContain('role="menuitem"')
    expect(component).toContain("event.key !== 'Escape'")
    expect(component).toContain("document.addEventListener('pointerdown'")
    expect(styles).toMatch(/\.mealActionBar\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\);/)
    expect(styles.match(/\.mealActionBar\s*\{[\s\S]*?\}/)?.[0]).not.toContain('overflow-x')
    expect(styles).toMatch(/\.mealActionBar button\s*\{[\s\S]*?min-height:\s*44px;/)
    expect(styles).toContain('.mealOverflowMenu')
    expect(styles).toContain(".mealOverflowMenu button[data-destructive]")
    expect(styles).not.toContain('.foodActionSet')
  })

  it('preserves all contextual actions and targets the selected logged food', () => {
    expect(component).toContain('aria-pressed={activeLog?.id === log.id}')
    expect(component).toContain('onReplaceFood(type, activeLog.id)')
    expect(component).toContain('onDeleteFood(activeLog.id)')
    for (const label of ['food', 'fromPlan', 'photo', 'replace', 'clearMeal', 'delete']) {
      expect(component).toContain(`t('${label}')`)
    }
  })
})
