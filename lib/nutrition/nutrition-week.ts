import { addNutritionDays } from './nutrition-date'
export function nutritionWeek(date: string): string[] {
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  const monday = addNutritionDays(date, -((weekday + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addNutritionDays(monday, i))
}
