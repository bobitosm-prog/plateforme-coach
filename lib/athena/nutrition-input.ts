import { z } from 'zod'

const text = z.string().trim().max(120)
const textList = z.array(text).max(40).default([])
const mealNames = z.object({ morning: textList, lunch: textList, snack: textList, dinner: textList }).default({ morning: [], lunch: [], snack: [], dinner: [] })
const availableFood = z.object({ nom: text, kcal: z.number().nonnegative(), p: z.number().nonnegative(), g: z.number().nonnegative(), l: z.number().nonnegative() })
const scannedFood = z.object({ name: text, brand: text.optional(), calories: z.number().nonnegative(), proteins: z.number().nonnegative(), carbs: z.number().nonnegative(), fat: z.number().nonnegative() })

export const athenaNutritionRequestSchema = z.object({
  calorie_goal: z.number().int().min(1000).max(6000),
  protein_goal: z.number().min(20).max(400),
  carbs_goal: z.number().min(20).max(1000),
  fat_goal: z.number().min(20).max(300),
  dietary_type: text.default('omnivore'),
  allergies: textList,
  dietary_restrictions: z.string().trim().max(500).default(''),
  disliked_foods: textList,
  objective_mode: z.enum(['seche', 'maintien', 'bulk']).default('maintien'),
  caloric_adjustment: z.number().min(-1500).max(1500).default(0),
  tdee: z.number().min(800).max(7000).optional(),
  activity_level: text.optional(),
  meal_food_names: mealNames,
  available_foods: z.array(availableFood).max(200).default([]),
  scanned_foods: z.array(scannedFood).max(40).default([]),
})

export type AthenaNutritionRequest = z.infer<typeof athenaNutritionRequestSchema>
