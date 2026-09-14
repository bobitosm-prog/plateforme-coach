import { z } from 'zod'

const foodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_g: z.number().positive().max(3000),
  calories: z.number().nonnegative().max(5000),
  proteins: z.number().nonnegative().max(500),
  carbs: z.number().nonnegative().max(1000),
  fats: z.number().nonnegative().max(500),
})

const outputSchema = z.object({
  foods: z.array(foodSchema).min(1).max(20),
  confidence: z.enum(['high', 'medium', 'low']),
})

export class AthenaMealPhotoOutputError extends Error {
  constructor() { super('Analyse photo non conforme au contrat Athena'); this.name = 'AthenaMealPhotoOutputError' }
}

export function validateAthenaMealPhoto(value: unknown) {
  const parsed = outputSchema.safeParse(value)
  if (!parsed.success) throw new AthenaMealPhotoOutputError()
  for (const food of parsed.data.foods) {
    const macroCalories = food.proteins * 4 + food.carbs * 4 + food.fats * 9
    if (Math.abs(food.calories - macroCalories) > Math.max(80, food.calories * 0.3)) {
      throw new AthenaMealPhotoOutputError()
    }
  }
  return {
    ...parsed.data,
    total_calories: Math.round(parsed.data.foods.reduce((sum, food) => sum + food.calories, 0)),
    estimate: true as const,
  }
}
