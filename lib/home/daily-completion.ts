import type { HomeViewModel } from './home-dashboard-model'
import { normalizeNutritionMealType } from '../nutrition/nutrition-dashboard-model'

export type DailyCompletionState = 'done' | 'pending' | 'unavailable'
export const DAILY_MEALS = ['breakfast', 'lunch', 'snack', 'dinner'] as const

/** Journal coverage is independent of calories; missing reads never count as success. */
export function resolveDailyCompletion(
  model: HomeViewModel,
  checkIn: { mood: string | null; sleep: string },
  water: { current: number; target: number; available: boolean },
) {
  const logged = new Set((model.nutrition.loggedMealTypes ?? []).map(normalizeNutritionMealType))
  const missingMeals = DAILY_MEALS.filter(type => !logged.has(type))
  const known = (state: string) => state !== 'loading' && state !== 'error'
  const training: DailyCompletionState = !known(model.training.state) ? 'unavailable'
    : model.training.dayStatus === 'completed' || model.training.dayStatus === 'rest' ? 'done' : 'pending'
  const nutrition: DailyCompletionState = !known(model.nutrition.state) || model.nutrition.loggedMealTypes == null ? 'unavailable'
    : missingMeals.length === 0 ? 'done' : 'pending'
  const sleep = checkIn.sleep.trim() === '' ? null : Number(checkIn.sleep)
  const morning: DailyCompletionState = !known(model.checkIn.state) ? 'unavailable'
    : Boolean(checkIn.mood) && sleep != null && Number.isFinite(sleep) && sleep >= 0 && sleep <= 14 ? 'done' : 'pending'
  const hydration: DailyCompletionState = !water.available || !Number.isFinite(water.target) || water.target <= 0 ? 'unavailable'
    : water.current >= water.target ? 'done' : 'pending'
  const states = { training, nutrition, morning, hydration }
  return { states, missingMeals, complete: Object.values(states).every(state => state === 'done') }
}
