import { FITNESS_FOODS, type FitnessFood } from '@/lib/fitness-food-database'

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

const FOOD_BY_NAME = new Map(FITNESS_FOODS.map(food => [fold(food.name), food]))

export function resolveFitnessFood(name: string): FitnessFood | null {
  return FOOD_BY_NAME.get(fold(name)) ?? null
}

export function nutritionForQuantity(food: FitnessFood, quantityG: number) {
  const scale = quantityG / 100
  return {
    calories: food.kcal * scale,
    protein: food.prot * scale,
    carbs: food.carb * scale,
    fat: food.fat * scale,
  }
}

export function isReferenceAmount(actual: number, expected: number, floor: number): boolean {
  return Math.abs(actual - expected) <= Math.max(floor, expected * 0.05)
}
