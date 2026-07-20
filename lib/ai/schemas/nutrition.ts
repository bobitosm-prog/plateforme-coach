import { z } from 'zod'

const boundedText = z.string().trim().min(1).max(10_000)
const nutrient = z.number().finite().nonnegative()

export const recipeOutputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5_000).optional(),
  category: z.string().trim().min(1).max(100),
  ingredients: z.array(z.object({
    name: boundedText,
    quantity_g: z.number().finite().positive(),
    calories: nutrient,
    proteins: nutrient,
    carbs: nutrient,
    fat: nutrient,
  }).strict()).min(1).max(100),
  instructions: z.array(z.object({ step: z.number().int().positive(), text: boundedText }).strict()).min(1).max(100),
  prep_time_min: z.number().finite().nonnegative(),
  cook_time_min: z.number().finite().nonnegative(),
  servings: z.number().finite().positive().optional(),
  calories_per_serving: nutrient,
  proteins_per_serving: nutrient,
  carbs_per_serving: nutrient,
  fat_per_serving: nutrient,
  tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
}).strict()

export const nutritionFoodItemSchema = z.object({
  aliment: z.string().trim().min(1).max(300),
  quantite_g: z.number().finite().positive(),
  calories: nutrient,
  proteines: nutrient,
  glucides: nutrient,
  lipides: nutrient,
}).strict()

export const legacyNutritionFoodItemSchema = z.object({
  aliment: z.string().trim().min(1).max(300),
  quantite_g: z.number().finite().positive(),
  kcal: nutrient,
  proteines: nutrient,
  glucides: nutrient,
  lipides: nutrient,
}).strict()

const legacyNutritionMealSchema = z.array(legacyNutritionFoodItemSchema).max(100)
export const legacyNutritionDayOutputSchema = z.object({
  repas: z.object({
    petit_dejeuner: legacyNutritionMealSchema,
    dejeuner: legacyNutritionMealSchema,
    collation: legacyNutritionMealSchema,
    diner: legacyNutritionMealSchema,
  }).strict(),
  total_kcal: nutrient.optional(),
  total_protein: nutrient.optional(),
  total_carbs: nutrient.optional(),
  total_fat: nutrient.optional(),
}).strict()

const nutritionMealSchema = z.array(nutritionFoodItemSchema).max(100)
export const nutritionDayOutputSchema = z.object({
  breakfast: nutritionMealSchema,
  snack: nutritionMealSchema,
  lunch: nutritionMealSchema,
  dinner: nutritionMealSchema,
  total_calories: nutrient.optional(),
  total_proteines: nutrient.optional(),
  total_glucides: nutrient.optional(),
  total_lipides: nutrient.optional(),
}).strict()

export const mealPhotoOutputSchema = z.object({
  foods: z.array(z.object({
    name: z.string().trim().min(1).max(300),
    quantity_g: z.number().finite().nonnegative(),
    calories: nutrient,
    proteins: nutrient,
    carbs: nutrient,
    fats: nutrient,
  }).strict()).max(100),
  total_calories: nutrient,
  confidence: z.enum(['high', 'medium', 'low']),
}).strict()

export type RecipeOutput = z.infer<typeof recipeOutputSchema>
export type NutritionFoodItem = z.infer<typeof nutritionFoodItemSchema>
export type LegacyNutritionFoodItem = z.infer<typeof legacyNutritionFoodItemSchema>
export type LegacyNutritionDayOutput = z.infer<typeof legacyNutritionDayOutputSchema>
export type NutritionDayOutput = z.infer<typeof nutritionDayOutputSchema>
export type MealPhotoOutput = z.infer<typeof mealPhotoOutputSchema>
