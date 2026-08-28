import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const tab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const tools = readFileSync('app/components/nutrition-v2/NutritionTools.tsx', 'utf8')
const recipes = readFileSync('app/components/RecipesSection.tsx', 'utf8')
const hook = readFileSync('app/hooks/useNutritionDashboardModel.ts', 'utf8')
const styles = readFileSync('app/components/nutrition-v2/NutritionV2.module.css', 'utf8')
const messages = readFileSync('messages/fr.json', 'utf8')

describe('Nutrition V2 compact tools', () => {
  it('keeps Journal and Plan as the only primary navigation entries', () => {
    const navigation = tab.slice(tab.indexOf('{/* PILLS NAVIGATION */}'), tab.indexOf('{/* Food search modal */}'))
    expect(navigation).toContain("id: 'today'")
    expect(navigation).toContain("id: 'plan'")
    expect(navigation).not.toContain("id: 'recipes'")
    expect(navigation).not.toContain("id: 'meals'")
  })

  it('moves recipes and saved meals to secondary tools without a direct data read', () => {
    expect(tab).toContain('<NutritionTools')
    expect(tab).toContain("onSavedMeals={() => setSubTab('meals')}")
    expect(tab).toContain("onRecipes={() => setSubTab('recipes')}")
    expect(tools).not.toContain('.from(')
    expect(tools).not.toContain('fetch(')
  })

  it('gates photo and recipe AI actions with capabilities', () => {
    expect(tab).toContain('photoEnabled={capabilities.ai}')
    expect(tab).toContain('recipesEnabled={capabilities.nutrition}')
    expect(tab).toContain('aiAllowed={capabilities.ai}')
    expect(tools).toContain('{photoEnabled &&')
    expect(recipes).toContain('{aiAllowed &&')
  })

  it('loads expensive secondary views lazily and leaves the scanner out of the promoted tools', () => {
    expect(tab).toContain("dynamic(() => import('../RecipesSection')")
    expect(tab).toContain("if (subTab === 'meals' && userId)")
    expect(tab).not.toContain('<BarcodeScanner')
    expect(tools).toContain("t('scannerPending')")
  })
})

describe('Nutrition V2 photo and error safety', () => {
  it('marks AI results as estimates and makes quantities editable before insertion', () => {
    expect(tab).toContain('<AiQuotaBadge />')
    expect(tab).toContain("nt('chrome.photoEstimate')")
    expect(tab).toContain('updatePhotoFoodQuantity')
    expect(tab).toContain('type="number"')
    expect(messages).toContain('Estimation IA à vérifier')
  })

  it('uses explicit generic failures rather than leaking provider errors', () => {
    expect(tab).toContain('role="status"')
    expect(recipes).toContain("toast.error(t('genError'))")
    expect(recipes).not.toContain('toast.error(e.message')
    expect(recipes).toContain('loadError')
  })

  it('keeps one shopping-list entry and no plan-generation authority in the tab', () => {
    expect(tab.match(/setShowShoppingModal\(true\)/g)).toHaveLength(1)
    expect(tab).not.toMatch(/generate-meal-plan|durationWeeks|NutritionPreferences/)
  })
})

describe('Nutrition V2 performance and accessibility guardrails', () => {
  it('adds no duplicate permanent dashboard reads', () => {
    expect(hook.match(/\.from\('daily_food_logs'\)/g)).toHaveLength(1)
    expect(hook.match(/\.from\('meal_tracking'\)/g)).toHaveLength(1)
    expect(hook.match(/\.from\('meal_plans'\)/g)).toHaveLength(1)
    expect(hook.match(/\.from\('client_meal_plans'\)/g)).toHaveLength(1)
    expect(hook.match(/\.from\('water_intake'\)/g)).toHaveLength(1)
  })

  it('keeps responsive touch targets, keyboard focus and reduced motion', () => {
    expect(styles).toContain('.toolsGrid button:focus-visible')
    expect(styles).toContain('min-height: 54px')
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
