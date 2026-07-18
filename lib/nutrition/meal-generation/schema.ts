import { z } from 'zod'

const finiteNonNegative = z.number().finite().nonnegative()
const boundedText = z.string().trim().max(500)
const stringList = z.array(z.string().trim().min(1).max(120)).max(100)

export const mealGenerationParamsSchema = z.object({
  calorie_goal: z.number().finite().positive().max(10_000),
  protein_goal: finiteNonNegative.max(1_000),
  carbs_goal: finiteNonNegative.max(2_000),
  fat_goal: finiteNonNegative.max(1_000),
  dietary_type: boundedText.optional(),
  allergies: stringList.optional(),
  disliked_foods: stringList.optional(),
  objective_mode: boundedText.optional(),
  caloric_adjustment: z.number().finite().min(-10_000).max(10_000).optional(),
  tdee: finiteNonNegative.max(10_000).optional(),
  activity_level: boundedText.optional(),
  ai_photo_analysis: z.string().max(8_000).optional(),
  available_foods: z.array(z.object({ nom: boundedText, kcal: finiteNonNegative, p: finiteNonNegative, g: finiteNonNegative, l: finiteNonNegative }).passthrough()).max(500).optional(),
  scanned_foods: z.array(z.object({ name: boundedText, brand: boundedText.optional(), calories: finiteNonNegative.optional(), proteins: finiteNonNegative.optional(), carbs: finiteNonNegative.optional(), fat: finiteNonNegative.optional() }).passthrough()).max(100).optional(),
  meal_food_names: z.object({ morning: stringList.optional(), lunch: stringList.optional(), snack: stringList.optional(), dinner: stringList.optional() }).passthrough().optional(),
}).passthrough()

export type ValidatedMealGenerationParams = z.output<typeof mealGenerationParamsSchema>
