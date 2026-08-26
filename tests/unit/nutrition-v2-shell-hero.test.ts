import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildNutritionViewModel,
  type NutritionViewModelInput,
} from '@/lib/nutrition/nutrition-dashboard-model'
import { getNutritionDayWindow, getNutritionWeekWindow } from '@/lib/nutrition/nutrition-date'
import {
  getCalorieBalance,
  getNutritionDateLabel,
  getNutritionHeroState,
} from '@/app/components/nutrition-v2/NutritionHero'

const shell = readFileSync('app/components/nutrition-v2/NutritionV2.tsx', 'utf8')
const hero = readFileSync('app/components/nutrition-v2/NutritionHero.tsx', 'utf8')
const macros = readFileSync('app/components/nutrition-v2/NutritionMacros.tsx', 'utf8')
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

function model(overrides: Partial<NutritionViewModelInput> = {}) {
  return buildNutritionViewModel({ ...baseInput, ...overrides })
}

describe('Nutrition V2 shell hierarchy', () => {
  it('renders the Hero before compact Macros and keeps legacy content last', () => {
    expect(shell.indexOf('<NutritionHero')).toBeLessThan(shell.indexOf('<NutritionMacros'))
    expect(shell.indexOf('<NutritionMacros')).toBeLessThan(shell.indexOf('data-nutrition-legacy-content'))
  })

  it('contains no Supabase access or generation/preferences controls', () => {
    expect(`${shell}\n${hero}\n${macros}`).not.toMatch(/supabase|generate-meal-plan|générer|preferences|préférences/i)
    expect(hero).not.toMatch(/meal_tracking|planned/i)
  })

  it('reuses the existing meal-add flow', () => {
    expect(tab).toContain("setSubTab('today')")
    expect(tab).toContain("setShowFoodSearch('dejeuner')")
    expect(tab).toContain('defaultMealType={showFoodSearch}')
  })
})

describe('Nutrition V2 Hero semantics', () => {
  it('keeps consumed calories distinct from targets', () => {
    const ready = model({
      dailyLogs: [{ id: 'log', date: day.localDateKey, meal_type: 'lunch', calories: 1_640, protein: 128, carbs: 172, fat: 54 }],
    })
    expect(ready.consumed.data?.calories).toBe(1_640)
    expect(ready.targets.data?.calories).toBe(2_100)
    expect(getNutritionHeroState(ready)).toBe('ready')
  })

  it('represents calories above target without hiding the excess', () => {
    expect(getCalorieBalance(2_260, 2_100)).toEqual({ kind: 'above', amount: 160 })
    expect(hero).toContain("t('above'")
  })

  it('does not invent a missing target', () => {
    const partial = model({
      profile: {},
      dailyLogs: [{ id: 'log', date: day.localDateKey, meal_type: 'dinner', calories: 800, protein: 52 }],
    })
    expect(getNutritionHeroState(partial)).toBe('partial')
    expect(getCalorieBalance(800, null)).toEqual({ kind: 'target_missing', amount: null })
    expect(hero).toContain("t('targetMissing')")
  })

  it('keeps database errors distinct from zero and empty days explicit', () => {
    const error = model({ errors: { dailyLogs: 'NUTRITION_DAILY_LOGS_READ_FAILED' } })
    const empty = model()
    expect(getNutritionHeroState(error)).toBe('error')
    expect(error.consumed.data).toBeNull()
    expect(getNutritionHeroState(empty)).toBe('empty')
    expect(hero).toContain('state === \'error\'')
    expect(hero).toContain('state === \'empty\'')
  })

  it('uses the Zurich day and selected date labels', () => {
    expect(getNutritionDateLabel({
      selectedDate: '2026-08-26',
      todayDate: '2026-08-26',
      locale: 'fr',
      todayLabel: 'Aujourd’hui',
      yesterdayLabel: 'Hier',
    })).toBe('Aujourd’hui')
    expect(getNutritionDateLabel({
      selectedDate: '2026-08-25',
      todayDate: '2026-08-26',
      locale: 'fr',
      todayLabel: 'Aujourd’hui',
      yesterdayLabel: 'Hier',
    })).toBe('Hier')
    expect(hero).toContain('NUTRITION_TIME_ZONE')
  })

  it('never counts meal_tracking planned state as consumed macros', () => {
    const tracked = model({
      tracking: [{ date: day.localDateKey, meal_type: 'lunch', completed: true }],
    })
    expect(tracked.consumed.state).toBe('empty')
    expect(tracked.consumed.data).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  })
})

describe('Nutrition V2 responsive and accessible structure', () => {
  it('provides native buttons, state semantics and accessible progress text', () => {
    expect(hero).toContain('type="button"')
    expect(hero).toContain('aria-busy')
    expect(hero).toContain('role="status"')
    expect(hero).toContain('role="progressbar"')
    expect(hero).toContain('aria-valuetext')
  })

  it('keeps compact mobile columns, desktop width and reduced motion support', () => {
    expect(styles).toContain('max-width: 1180px')
    expect(styles).toContain('@media (max-width: 767px)')
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toMatch(/\.shell\s*\{[\s\S]*?overflow-x:\s*hidden;/)
    for (const selector of ['hero', 'macros', 'todayMeals']) {
      const block = styles.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
      expect(block).not.toMatch(/overflow-x:\s*auto/)
    }
  })
})
