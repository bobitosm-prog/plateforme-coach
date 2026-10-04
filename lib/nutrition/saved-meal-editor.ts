/** Saved meal nutrients are portion totals. Keep an immutable basis while typing. */
export function prepareSavedFood(food: Record<string, any>) {
  const quantity = Number(food.quantity_g ?? food.quantity ?? 100)
  const nutrients = {
    calories: Number(food.calories ?? 0),
    protein: Number(food.protein ?? food.proteins ?? 0),
    carbs: Number(food.carbs ?? 0),
    fat: Number(food.fat ?? food.fats ?? 0),
  }
  const basis = food.nutrition_per_100g ?? Object.fromEntries(
    Object.entries(nutrients).map(([key, value]) => [key, quantity > 0 ? value * 100 / quantity : 0]),
  )
  return { ...food, ...nutrients, name: food.name ?? food.custom_name ?? '', quantity, quantity_g: quantity, nutrition_per_100g: basis }
}

export function resizeSavedFood(food: Record<string, any>, input: string) {
  const prepared = prepareSavedFood(food)
  const quantity = input === '' ? '' : Number(input)
  const scale = Number(quantity) / 100
  const totals = Object.fromEntries(Object.entries(prepared.nutrition_per_100g).map(([key, value]) => [key, Number(value) * scale]))
  return { ...prepared, ...totals, quantity, quantity_g: quantity }
}

export function savedMealTotals(foods: Record<string, any>[]) {
  const values = foods.map(prepareSavedFood)
  const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') => Math.round(values.reduce((total, food) => total + food[key], 0) * 100) / 100
  return { total_calories: sum('calories'), total_proteins: sum('protein'), total_carbs: sum('carbs'), total_fats: sum('fat') }
}

export function validSavedMeal(meal: Record<string, any>) {
  return !!meal.name?.trim() && ['petit_dejeuner', 'dejeuner', 'collation', 'diner'].includes(meal.meal_type)
    && Array.isArray(meal.foods) && meal.foods.length > 0 && meal.foods.every((food: Record<string, any>) => {
      const normalized = prepareSavedFood(food)
      return Number.isFinite(normalized.quantity) && normalized.quantity > 0 && normalized.quantity <= 10000
        && (['calories', 'protein', 'carbs', 'fat'] as const).every(key => Number.isFinite(normalized[key]) && normalized[key] >= 0)
    })
}
