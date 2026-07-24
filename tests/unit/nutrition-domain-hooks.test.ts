import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { mergeNutritionRecipeRows, resolveNutritionGoals } from '@/app/hooks/nutrition'
import type { RecipeRow } from '@/lib/repositories/nutrition'

function recipe(id: string, createdAt: string): RecipeRow {
  return { id, created_at: createdAt } as RecipeRow
}

describe('Nutrition domain hook contracts', () => {
  it('keeps explicit zero goals distinct from unknown values', () => {
    expect(resolveNutritionGoals({ calorie_goal: 0, protein_goal: null, carbs_goal: 0, fat_goal: null })).toEqual({
      values: { calories: 0, protein: null, carbs: 0, fat: null },
      complete: false,
      missing: ['protein', 'fat'],
      state: 'ready',
    })
    expect(resolveNutritionGoals(null).state).toBe('empty')
    expect(resolveNutritionGoals({ calorie_goal: 2000, protein_goal: 140, carbs_goal: 220, fat_goal: 60 }).complete).toBe(true)
  })

  it('merges owner and public recipes deterministically without duplicating an owner-visible public row', () => {
    const privateRows = [recipe('shared', '2026-07-17'), recipe('private', '2026-07-18')]
    const publicRows = [recipe('public', '2026-07-16'), recipe('shared', '2026-07-17')]
    const merged = mergeNutritionRecipeRows(privateRows, publicRows)
    expect(merged.map(row => row.id)).toEqual(['private', 'shared', 'public'])
    expect(privateRows.map(row => row.id)).toEqual(['shared', 'private'])
    expect(publicRows.map(row => row.id)).toEqual(['public', 'shared'])
  })

  it('defines four isolated hooks with no wildcard projection, client construction or loose any', () => {
    const files = ['useNutritionJournal.ts', 'useNutritionPlans.ts', 'useNutritionRecipes.ts', 'useNutritionGoals.ts']
    const source = files.map(file => readFileSync(`app/hooks/nutrition/${file}`, 'utf8')).join('\n')
    expect(source).not.toMatch(/select\(['"]\*['"]|createClient|service_role|:\s*any\b|<any>/)
    expect(source).not.toMatch(/from ['"](?:@\/app|next\/|react-dom)/)
    expect(source).toContain('createNutritionRecipeRepository')
    expect(source).toContain("from('daily_food_logs')")
    expect(source).toContain('createActivePersonalMealPlanReader')
  })

  it('wires journal, plans, recipes and goals to their existing consumers', () => {
    const nutritionTab = readFileSync('app/components/tabs/NutritionTab.tsx', 'utf8')
    const recipes = readFileSync('app/components/RecipesSection.tsx', 'utf8')
    const preferences = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
    expect(nutritionTab).toContain('useNutritionJournal({')
    expect(nutritionTab).toContain('useNutritionPlans({')
    expect(recipes).toContain('useNutritionRecipes({')
    expect(preferences).toContain('useNutritionGoals(profile)')
  })

  it('preserves the historical useFoodLog facade and dashboard spread contract', () => {
    const facade = readFileSync('app/hooks/useFoodLog.ts', 'utf8')
    const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
    for (const member of ['foodSearch', 'foodResults', 'selectedFood', 'foodQty', 'mealType', 'customFoodForm', 'searchTab', 'addFoodToMeal', 'addCustomFood']) {
      expect(facade).toContain(member)
    }
    expect(dashboard).toContain('...foodHook')
  })

  it('keeps the three journal histories separate', () => {
    const journal = readFileSync('lib/repositories/nutrition/journal.ts', 'utf8')
    expect(journal).toContain('listDailyFoodLogsForOwner')
    expect(journal).toContain('listLegacyMealLogsForOwner')
    expect(journal).toContain('listMealCompletionsForOwner')
    expect(journal).not.toMatch(/merge|concat/)
  })
})
