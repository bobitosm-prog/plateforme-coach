export interface MealDraftFood {
  id: string
  name: string
  quantity: number
  baseQuantity: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** All nutrient values describe baseQuantity, not implicitly 100 g. */
export function draftFood(food: Record<string, any>): MealDraftFood {
  const quantity = Number(food.quantity_g ?? food.quantity ?? food.qty ?? 100)
  const result = {
    id: crypto.randomUUID(), name: String(food.custom_name ?? food.name ?? food.nom ?? '').trim(),
    quantity, baseQuantity: quantity,
    calories: Number(food.calories ?? food.kcal), protein: Number(food.protein ?? food.proteins ?? food.prot),
    carbs: Number(food.carbs ?? food.carb), fat: Number(food.fat ?? food.fats),
  }
  if (!result.name || !Number.isFinite(quantity) || quantity <= 0 ||
      [result.calories, result.protein, result.carbs, result.fat].some(value => !Number.isFinite(value) || value < 0)) throw new Error('INVALID_FOOD')
  return result
}

export function draftNutrients(food: MealDraftFood) {
  const ratio = food.quantity / food.baseQuantity
  const round = (value: number) => Math.round(value * ratio * 10) / 10
  return {calories: Math.round(food.calories * ratio), protein: round(food.protein), carbs: round(food.carbs), fat: round(food.fat)}
}

export function mealDraftRows(foods: MealDraftFood[], userId: string, date: string, mealType: string) {
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['petit_dejeuner','dejeuner','collation','diner'].includes(mealType) || !foods.length) throw new Error('INVALID_MEAL')
  return foods.map(food => {
    if (!Number.isFinite(food.quantity) || food.quantity <= 0 || !Number.isFinite(food.baseQuantity) || food.baseQuantity <= 0) throw new Error('INVALID_QUANTITY')
    const nutrients = draftNutrients(food)
    if (Object.values(nutrients).some(value => !Number.isFinite(value) || value < 0)) throw new Error('INVALID_NUTRIENTS')
    return {id: food.id, user_id: userId, date, meal_type: mealType, custom_name: food.name, quantity_g: food.quantity, ...nutrients}
  })
}

export async function persistMealDraft(db: any, rows: ReturnType<typeof mealDraftRows>) {
  // One atomic INSERT, stable IDs and DO NOTHING on conflict: retry cannot double the meal.
  const {error} = await db.from('daily_food_logs').upsert(rows, {onConflict: 'id', ignoreDuplicates: true})
  if (error) throw new Error('MEAL_SAVE_FAILED')
}
