import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const facade = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
const repository = readFileSync('lib/repositories/nutrition/recipes.ts', 'utf8')
const selection = readFileSync('lib/nutrition/saved-meal-selection.ts', 'utf8')

describe('saved meal import selection architecture', () => {
  it('uses one owner-scoped ordered read with the deployed projection', () => {
    expect(facade).toContain("from('saved_meals').select(SAVED_MEAL_PROJECTION)")
    expect(facade).toContain(".eq('user_id', userId).order('created_at', { ascending: false })")
    expect(repository).toContain('total_protein:total_proteins')
    expect(repository).toContain('total_fat:total_fats')
  })

  it('does not add historical filters that never existed', () => {
    const readStart = facade.indexOf("from('saved_meals').select(SAVED_MEAL_PROJECTION)")
    const readEnd = facade.indexOf('async function applySavedMeal', readStart)
    const read = facade.slice(readStart, readEnd)
    expect(read).not.toMatch(/archived|deleted_at|visibility|is_active|created_by/)
    expect(repository).not.toMatch(/saved_meals[\s\S]{0,300}(?:archived|deleted_at|visibility)/)
  })

  it('leaves the Mes repas read on its historical wildcard path', () => {
    expect(facade).toContain(
      "from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })",
    )
  })

  it('distinguishes loading, empty and error and rejects stale responses', () => {
    expect(selection).toContain("status: 'idle' | 'loading' | 'ready' | 'empty' | 'error'")
    expect(selection).toContain('if (!isCurrentRequest) return previous')
    expect(selection).toContain("if (read.error) return { status: 'error', meals: previous.meals }")
    expect(facade).toContain('request === savedMealSelectionRequest.current')
    expect(facade).toContain('setSavedMealSelection(createEmptySavedMealSelection())')
    expect(facade).toContain('setShowSavedMeals(false)')
    expect(facade).not.toMatch(/setSavedMeals\(data \|\| \[\]\)/)
  })

  it('does not alter saved-meal writes or create a second source', () => {
    expect(selection).not.toMatch(/insert|update|upsert|delete|createClient|service_role/)
    expect(facade.match(/from\('saved_meals'\)\.select\(SAVED_MEAL_PROJECTION\)/g))
      .toHaveLength(1)
  })
})
