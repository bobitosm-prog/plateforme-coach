export type Profile = {
  id: string; full_name: string | null; email: string | null
  current_weight: number | null; start_weight: number | null
  calorie_goal: number | null; created_at: string
  phone: string | null; birth_date: string | null; gender: string | null
  height: number | null; target_weight: number | null
  body_fat_pct: number | null; objective: string | null; status: string | null
  dietary_type: string | null; allergies: string[] | null; liked_foods: string[] | null
  meal_preferences: Record<string, string[] | undefined> | null
  activity_level: string | null; tdee: number | null; protein_goal: number | null
  carbs_goal: number | null; fat_goal: number | null
}
export type WorkoutSession = {
  id: string; created_at: string; name: string | null
  completed: boolean | null; duration_minutes: number | null; notes: string | null
  muscles_worked: string[] | null
}
export type WeightLog = { id: string; poids: number; date: string }
export type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
export type DayData = { repos: boolean; exercises: Exercise[]; day_name?: string }
export type WeekProgram = Record<string, DayData>
export type FoodItem = { name: string; qty: string; kcal: number; prot: number; carb: number; fat: number }
export type Meal = { type: string; foods: FoodItem[] }
export type DayMealData = { meals: Meal[] }
export type WeekMealPlan = Record<string, DayMealData>

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const
export const DAY_LABELS: Record<string, string> = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' }
export const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'] as const

export function defaultProgram(): WeekProgram {
  return Object.fromEntries(DAYS.map(day => [day, { repos: false, exercises: [] }]))
}

export function normalizeAndSanitize(raw: unknown): WeekProgram {
  const normalized: Record<string, unknown> = Array.isArray(raw)
    ? Object.fromEntries(DAYS.map((day, index) => [day, raw[index]]))
    : raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result: WeekProgram = {}
  for (const day of DAYS) {
    const value = normalized[day]
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      result[day] = { repos: true, exercises: [], day_name: '' }
      continue
    }
    const legacy = value as { is_rest?: unknown; repos?: unknown; exercises?: unknown; day_name?: unknown; name?: unknown }
    result[day] = {
      repos: legacy.repos === true || legacy.is_rest === true,
      exercises: Array.isArray(legacy.exercises) ? legacy.exercises as Exercise[] : [],
      day_name: typeof legacy.day_name === 'string' ? legacy.day_name : typeof legacy.name === 'string' ? legacy.name : '',
    }
  }
  return result
}

export function defaultMealPlan(): WeekMealPlan {
  return Object.fromEntries(DAYS.map(day => [day, { meals: MEAL_TYPES.map(type => ({ type, foods: [] })) }]))
}

export function defaultFood(): FoodItem {
  return { name: '', qty: '', kcal: 0, prot: 0, carb: 0, fat: 0 }
}

export function currentMonday(): string {
  const date = new Date()
  const difference = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + difference)
  return date.toISOString().split('T')[0]
}
