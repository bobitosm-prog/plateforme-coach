import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { validateAthenaMealPhoto } from '@/lib/athena/meal-photo-output'
import { validateAthenaRecipe } from '@/lib/athena/recipe-output'

describe('Athena recipe output', () => {
  const recipe = {
    title: 'Bol poulet riz', description: 'Un repas simple.', category: 'dejeuner',
    prep_time_min: 10, cook_time_min: 15, servings: 1,
    ingredients: [
      { name: 'Blanc de poulet cuit', quantity_g: 200, calories: 330, proteins: 62, carbs: 0, fat: 7.2 },
      { name: 'Riz basmati cuit', quantity_g: 200, calories: 260, proteins: 5.4, carbs: 56, fat: 0.6 },
    ],
    instructions: [{ step: 1, text: 'Assembler les ingrédients.' }], tags: ['high-protein'],
    calories_per_serving: 9999, proteins_per_serving: 999,
    carbs_per_serving: 999, fat_per_serving: 999,
  }

  it('recomputes recipe totals from canonical ingredients', () => {
    expect(validateAthenaRecipe(recipe)).toMatchObject({ calories_per_serving: 590, proteins_per_serving: 67.4, carbs_per_serving: 56, fat_per_serving: 7.8 })
  })

  it('rejects invented ingredients and fabricated values', () => {
    expect(() => validateAthenaRecipe({ ...recipe, ingredients: [{ ...recipe.ingredients[0], name: 'Poudre miracle' }] })).toThrow(/non conforme/)
    expect(() => validateAthenaRecipe({ ...recipe, ingredients: [{ ...recipe.ingredients[0], calories: 900 }] })).toThrow(/non conforme/)
  })
})

describe('Athena meal photo output', () => {
  const output = { foods: [{ name: 'Poulet visible', quantity_g: 150, calories: 250, proteins: 35, carbs: 10, fats: 8 }], total_calories: 9999, confidence: 'medium' }

  it('validates bounded estimates and recomputes the total', () => expect(validateAthenaMealPhoto(output)).toMatchObject({ total_calories: 250, estimate: true }))
  it('rejects arithmetically incoherent estimates', () => expect(() => validateAthenaMealPhoto({ ...output, foods: [{ ...output.foods[0], calories: 1200 }] })).toThrow(/non conforme/))
  it('logs usage only after validated output in both endpoints', () => {
    const photo = readFileSync('app/api/analyze-meal-photo/route.ts', 'utf8')
    const recipeRoute = readFileSync('app/api/generate-recipe/route.ts', 'utf8')
    expect(photo.indexOf('validateAthenaMealPhoto(')).toBeLessThan(photo.indexOf("logAiUsage(supabase, user.id, 'analyze-meal-photo')"))
    expect(recipeRoute).not.toContain('recipeProfile')
    expect(recipeRoute).not.toContain('foodsList')
    expect(recipeRoute).toContain('ATHENA_GENERATION_PROFILE_COLUMNS')
    expect(recipeRoute).toContain('buildAthenaClientContext(capabilityProfile)')
    expect(recipeRoute.indexOf('validateAthenaRecipe(')).toBeLessThan(recipeRoute.indexOf("logAiUsage(supabase, user.id, 'generate-recipe')"))
  })
})
