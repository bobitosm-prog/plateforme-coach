import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const facade = fs.readFileSync(
  'app/components/tabs/NutritionTab.tsx',
  'utf8',
)
const hook = fs.readFileSync(
  'app/hooks/nutrition/useSavedMealsLibrary.ts',
  'utf8',
)
const reader = fs.readFileSync(
  'lib/nutrition/saved-meals-library.ts',
  'utf8',
)

describe('C06 Mes repas runtime boundary', () => {
  it('keeps one owner-scoped wildcard read with descending historical order', () => {
    expect(hook.match(
      /from\('saved_meals'\)\.select\('\*'\)/g,
    )).toHaveLength(1)
    expect(hook).toContain(
      ".eq('user_id', userId).order('created_at', { ascending: false })",
    )
    expect(facade).toContain('useSavedMealsLibrary({')
  })

  it('adds a request counter, cleanup and rejected-promise settlement', () => {
    expect(hook).toContain('requestId.current')
    expect(hook).toContain('return () => { requestId.current += 1 }')
    expect(hook).toContain('settleSavedMealsLibraryRead(')
    expect(hook).toContain("new Error('saved_meals_network_failure')")
  })

  it('does not collapse null data or errors into an empty array', () => {
    expect(reader).toContain('if (read.error || read.data === null)')
    expect(hook).not.toContain('setMyMeals(data || [])')
  })

  it('keeps the import selector on its independent secured cycle', () => {
    expect(facade.match(
      /from\('saved_meals'\)\.select\(SAVED_MEAL_PROJECTION\)/g,
    )).toHaveLength(1)
    expect(facade).toContain('savedMealSelectionRequest.current')
    expect(facade).toContain('settleSavedMealSelection(')
  })

  it('does not add writes to the pure reader', () => {
    expect(reader).not.toMatch(
      /insert|update|upsert|delete|rpc|createClient|service_role/,
    )
  })
})
