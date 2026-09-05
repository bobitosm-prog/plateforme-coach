import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAiQuotaBadgeState } from '@/app/components/ui/AiQuotaBadge'
import { resolveSavedMealsLoadState } from '@/app/components/tabs/NutritionTab'

const quotaBadge = readFileSync('app/components/ui/AiQuotaBadge.tsx', 'utf8')
const nutritionTab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const translations = ['fr', 'en', 'de'].map(locale => (
  JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
))

describe('Nutrition V2 quota states', () => {
  it('keeps loading and read errors distinct from exhaustion', () => {
    expect(resolveAiQuotaBadgeState({ loading: true, error: null, remaining: 0 })).toBe('loading')
    expect(resolveAiQuotaBadgeState({ loading: false, error: 'provider detail', remaining: 0 })).toBe('error')
  })

  it('uses exhaustion only for a successful zero quota', () => {
    expect(resolveAiQuotaBadgeState({ loading: false, error: null, remaining: 0 })).toBe('exhausted')
    expect(resolveAiQuotaBadgeState({ loading: false, error: null, remaining: 2 })).toBe('available')
  })

  it('renders a localized generic error without provider details', () => {
    expect(quotaBadge).toContain("state === 'error'")
    expect(quotaBadge).toContain("t('unavailable')")
    expect(quotaBadge).not.toContain('error.message')
    for (const messages of translations) {
      expect(messages.aiQuotaBadge.unavailable).toBeTruthy()
      expect(messages.aiQuotaBadge.exhausted).toBeTruthy()
    }
  })
})

describe('Nutrition V2 saved meals states', () => {
  it('keeps a successful empty result distinct from a query error', () => {
    expect(resolveSavedMealsLoadState(null, [])).toBe('empty')
    expect(resolveSavedMealsLoadState(null, [{ id: 'meal' }])).toBe('ready')
    expect(resolveSavedMealsLoadState({ code: 'PRIVATE_PROVIDER_CODE' }, [])).toBe('error')
  })

  it('sets loading before the query and exposes a retry for errors', () => {
    expect(nutritionTab).toContain("setSavedMealsState('loading')")
    expect(nutritionTab).toContain("savedMealsState === 'error'")
    expect(nutritionTab).toContain('loadSavedMeals(useSavedMealTarget)')
    expect(nutritionTab).toContain("nt('savedMeals.retry')")
  })

  it('does not render a raw Supabase error or reuse the empty label for errors', () => {
    const errorBranch = nutritionTab.slice(
      nutritionTab.indexOf("savedMealsState === 'error'"),
      nutritionTab.indexOf("savedMealsState === 'empty'"),
    )
    expect(errorBranch).toContain("nt('savedMeals.error')")
    expect(errorBranch).not.toContain("nt('savedMeals.empty')")
    expect(errorBranch).not.toMatch(/error\.message|error\.code/)
    for (const messages of translations) {
      expect(messages.nutrition_tab.savedMeals.error).toBeTruthy()
      expect(messages.nutrition_tab.savedMeals.retry).toBeTruthy()
    }
  })
})
