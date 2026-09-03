import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildNutritionViewModel,
  normalizeNutritionMealType,
  resolveActiveNutritionPlan,
  type NutritionViewModelInput,
} from '@/lib/nutrition/nutrition-dashboard-model'
import {
  getNutritionDayWindow,
  getNutritionWeekWindow,
  NUTRITION_TIME_ZONE,
} from '@/lib/nutrition/nutrition-date'
import type { NutritionPlanGenerationConfig } from '@/lib/nutrition/nutrition-plan-generation'

const hook = readFileSync('app/hooks/useNutritionDashboardModel.ts', 'utf8')
const tab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const page = readFileSync('app/(application)/page.tsx', 'utf8')

const day = getNutritionDayWindow(new Date('2026-08-24T12:00:00.000Z'))
const week = getNutritionWeekWindow(day.date)
const capabilities = { ai: true, training: true, nutrition: true, coachManaged: false }
const personalPlan = {
  id: 'personal-plan',
  active: true,
  plan: {
    lundi: {
      repas: {
        petit_dejeuner: [{ aliment: 'Avoine', quantite_g: 80, kcal: 300, proteines: 15, glucides: 45, lipides: 7 }],
      },
    },
  },
}

function input(overrides: Partial<NutritionViewModelInput> = {}): NutritionViewModelInput {
  return {
    day,
    week,
    selectedDate: day.localDateKey,
    profile: { calorie_goal: 2_000, protein_goal: 150, carbs_goal: 220, fat_goal: 65, water_goal: 3_000 },
    capabilities,
    coachRelation: { status: 'not_found', coachId: null },
    dailyLogs: [],
    tracking: [],
    personalPlan,
    coachPlan: null,
    hydration: [],
    ...overrides,
  }
}

describe('Nutrition V2 canonical schema', () => {
  it('uses deployed canonical columns and removes obsolete aliases', () => {
    expect(hook).toContain(".select('date,meal_type,completed')")
    expect(hook).toContain(".select('id,user_id,plan,active,created_at')")
    expect(hook).toContain(".eq('active', true)")
    expect(`${hook}\n${tab}`).not.toMatch(/\bis_completed\b|\bplan_data\b|\bis_active\b/)
    expect(tab).not.toMatch(/total_proteins|total_fats|use_count/)
  })

  it('does not add an API, SQL migration or permanent dashboard read', () => {
    expect(page.match(/useNutritionDashboardModel/g)).toBeNull()
    expect(hook).not.toContain('/api/')
    expect(hook).not.toContain('create table')
  })
})

describe('Nutrition V2 Zurich day boundaries', () => {
  it('uses Europe/Zurich and resolves the local date', () => {
    expect(NUTRITION_TIME_ZONE).toBe('Europe/Zurich')
    expect(getNutritionDayWindow(new Date('2026-08-23T22:30:00.000Z')).localDateKey).toBe('2026-08-24')
  })

  it('handles spring and autumn DST day lengths', () => {
    const spring = getNutritionDayWindow(new Date('2026-03-29T12:00:00.000Z'))
    const autumn = getNutritionDayWindow(new Date('2026-10-25T12:00:00.000Z'))
    expect(spring.todayEnd.getTime() - spring.todayStart.getTime()).toBe(23 * 60 * 60 * 1000)
    expect(autumn.todayEnd.getTime() - autumn.todayStart.getTime()).toBe(25 * 60 * 60 * 1000)
  })
})

describe('Nutrition V2 consumption and meals', () => {
  it('uses daily_food_logs only for consumed values and keeps targets separate', () => {
    const model = buildNutritionViewModel(input({
      dailyLogs: [{ id: 'log-1', date: day.localDateKey, meal_type: 'breakfast', calories: 420, protein: 31, carbs: 44, fat: 12 }],
      tracking: [{ date: day.localDateKey, meal_type: 'petit_dejeuner', completed: true }],
    }))
    expect(model.consumed.data).toEqual({ calories: 420, protein: 31, carbs: 44, fat: 12 })
    expect(model.targets.data?.calories).toBe(2_000)
    expect(model.meals.data?.[0].completed).toBe(true)
  })

  it('does not turn a read error into zero consumption', () => {
    const model = buildNutritionViewModel(input({ errors: { dailyLogs: 'NUTRITION_DAILY_LOGS_READ_FAILED' } }))
    expect(model.consumed.state).toBe('error')
    expect(model.consumed.data).toBeNull()
    expect(model.summary.data).toBeNull()
  })

  it('normalizes historical meal aliases', () => {
    expect(normalizeNutritionMealType('petit_dejeuner')).toBe('breakfast')
    expect(normalizeNutritionMealType('morning')).toBe('breakfast')
    expect(normalizeNutritionMealType('dejeuner')).toBe('lunch')
    expect(normalizeNutritionMealType('collation')).toBe('snack')
    expect(normalizeNutritionMealType('dîner')).toBe('dinner')
  })

  it('keeps planned and logged data distinct', () => {
    const model = buildNutritionViewModel(input({
      dailyLogs: [{ id: 'log-1', date: day.localDateKey, meal_type: 'breakfast', calories: 100, protein: 5, carbs: 15, fat: 2 }],
    }))
    const breakfast = model.meals.data?.find(meal => meal.type === 'breakfast')
    expect(breakfast?.planned).toHaveLength(1)
    expect(breakfast?.logged).toHaveLength(1)
    expect(breakfast?.status).toBe('partially_logged')
    expect(model.consumed.data?.calories).toBe(100)
  })
})

describe('Nutrition V2 active plan authority', () => {
  const coachPlan = { id: 'coach-plan', coach_id: 'coach-1', plan: { lundi: { repas: {} } } }

  it('prefers a matching coach plan only for an active relation', () => {
    expect(resolveActiveNutritionPlan({ coachRelationStatus: 'active', coachId: 'coach-1', isAuthoritative: true, coachMealPlan: coachPlan, personalMealPlan: personalPlan }).source).toBe('coach')
  })

  it.each(['not_found', 'multiple_active', 'error'] as const)('rejects stale coach plans for %s', status => {
    const result = resolveActiveNutritionPlan({ coachRelationStatus: status, coachId: null, isAuthoritative: false, coachMealPlan: coachPlan, personalMealPlan: personalPlan })
    expect(result.source).toBe(status === 'not_found' ? 'personal' : 'none')
    expect(result.coachId).toBeNull()
  })

  it('rejects a plan from a different coach', () => {
    expect(resolveActiveNutritionPlan({ coachRelationStatus: 'active', coachId: 'coach-2', isAuthoritative: true, coachMealPlan: coachPlan, personalMealPlan: personalPlan }).source).toBe('personal')
  })

  it('does not use coachManaged as relation proof', () => {
    const model = buildNutritionViewModel(input({ capabilities: { ...capabilities, coachManaged: true } }))
    expect(model.activePlan.source).toBe('personal')
  })

  it('clears relation-bound plan state before refreshing', () => {
    expect(hook).toContain("coachPlan: null, errors: {}")
  })
})

describe('Nutrition V2 tools and future generation contract', () => {
  it('gates photo analysis with the AI capability', () => {
    const denied = buildNutritionViewModel(input({ capabilities: { ...capabilities, ai: false } }))
    expect(denied.tools.state).toBe('ready')
    expect(denied.tools.photoAnalysis).toBe(false)
    expect(denied.tools.foodSearch).toBe(true)
  })

  it('keeps future multi-week configuration outside the daily model', () => {
    const configuration: NutritionPlanGenerationConfig = {
      durationWeeks: 4,
      dailyCalories: 2_200,
      macros: { protein: 160, carbs: 240, fat: 70 },
      mealsPerDay: 4,
      mealDistribution: { breakfast: 0.25, lunch: 0.3, snack: 0.15, dinner: 0.3 },
      dietType: 'omnivore',
      restrictions: [],
      likedFoods: [],
      dislikedFoods: [],
      mealPreferences: {},
    }
    expect(configuration.durationWeeks).toBe(4)
    expect(buildNutritionViewModel(input())).not.toHaveProperty('generation')
  })
})
