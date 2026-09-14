import { z } from 'zod'

import { isReferenceAmount, nutritionForQuantity, resolveFitnessFood } from '@/lib/nutrition/food-reference'

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_g: z.number().positive().max(2000),
  calories: z.number().nonnegative().max(5000),
  proteins: z.number().nonnegative().max(500),
  carbs: z.number().nonnegative().max(1000),
  fat: z.number().nonnegative().max(500),
})

const recipeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(300),
  category: z.string().trim().min(1).max(40),
  prep_time_min: z.number().int().nonnegative().max(180),
  cook_time_min: z.number().int().nonnegative().max(240),
  servings: z.number().int().positive().max(12),
  ingredients: z.array(ingredientSchema).min(1).max(8),
  instructions: z.array(z.object({ step: z.number().int().positive().max(20), text: z.string().trim().min(1).max(500) })).min(1).max(20),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
})

export class AthenaRecipeOutputError extends Error {
  constructor() { super('Recette non conforme au contrat Athena'); this.name = 'AthenaRecipeOutputError' }
}

export function validateAthenaRecipe(value: unknown) {
  const parsed = recipeSchema.safeParse(value)
  if (!parsed.success) throw new AthenaRecipeOutputError()
  const ingredients = parsed.data.ingredients.map(ingredient => {
    const reference = resolveFitnessFood(ingredient.name)
    if (!reference) throw new AthenaRecipeOutputError()
    const expected = nutritionForQuantity(reference, ingredient.quantity_g)
    if (!isReferenceAmount(ingredient.calories, expected.calories, 5)
      || !isReferenceAmount(ingredient.proteins, expected.protein, 2)
      || !isReferenceAmount(ingredient.carbs, expected.carbs, 2)
      || !isReferenceAmount(ingredient.fat, expected.fat, 2)) throw new AthenaRecipeOutputError()
    return {
      ...ingredient,
      name: reference.name,
      calories: Math.round(expected.calories),
      proteins: Math.round(expected.protein * 10) / 10,
      carbs: Math.round(expected.carbs * 10) / 10,
      fat: Math.round(expected.fat * 10) / 10,
    }
  })
  const totals = ingredients.reduce((sum, ingredient) => ({
    calories: sum.calories + ingredient.calories,
    proteins: sum.proteins + ingredient.proteins,
    carbs: sum.carbs + ingredient.carbs,
    fat: sum.fat + ingredient.fat,
  }), { calories: 0, proteins: 0, carbs: 0, fat: 0 })
  return {
    ...parsed.data,
    ingredients,
    calories_per_serving: Math.round(totals.calories / parsed.data.servings),
    proteins_per_serving: Math.round(totals.proteins / parsed.data.servings * 10) / 10,
    carbs_per_serving: Math.round(totals.carbs / parsed.data.servings * 10) / 10,
    fat_per_serving: Math.round(totals.fat / parsed.data.servings * 10) / 10,
  }
}
