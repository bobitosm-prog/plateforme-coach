// lib/meal-plan.ts
// Canonical meal plan format + tolerant parser for legacy formats.
// Sprint 6.6 — Unification format meal plans.

export type MealType = 'Petit-déjeuner' | 'Déjeuner' | 'Collation' | 'Dîner'
export type Day = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

export const DAYS: readonly Day[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const
export const MEAL_TYPES: readonly MealType[] = ['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'] as const

// AI legacy keys → canonical MealType
const AI_MEAL_KEY_TO_TYPE: Record<string, MealType> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
}

export interface Food {
  name: string
  qty: number      // grams
  kcal: number
  prot: number
  carb: number
  fat: number
}

export interface Meal {
  type: MealType
  foods: Food[]
}

export interface DayTotals {
  kcal: number
  prot: number
  carb: number
  fat: number
}

export interface DayPlan {
  meals: Meal[]
  totals?: DayTotals
}

export type MealPlan = Partial<Record<Day, DayPlan>>

// ─── Parsers ────────────────────────────────────────────────────────────────

/** Coerce any value to a finite number, fallback 0. */
function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Normalize a single food entry from any legacy format. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFood(raw: any): Food {
  if (!raw || typeof raw !== 'object') {
    return { name: '', qty: 0, kcal: 0, prot: 0, carb: 0, fat: 0 }
  }
  return {
    name: String(raw.name ?? raw.aliment ?? '').trim(),
    qty:  num(raw.qty ?? raw.quantite_g ?? raw.quantity_g),
    kcal: num(raw.kcal ?? raw.calories),
    prot: num(raw.prot ?? raw.proteines ?? raw.protein ?? raw.proteins),
    carb: num(raw.carb ?? raw.glucides ?? raw.carbs),
    fat:  num(raw.fat ?? raw.lipides ?? raw.fats),
  }
}

/** Normalize the meals of a single day. Accepts both Coach and AI shapes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMeals(raw: any): Meal[] {
  if (!raw || typeof raw !== 'object') return []

  // Coach shape: { meals: [{ type, foods }] }
  if (Array.isArray(raw.meals)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.meals.map((m: any) => ({
      type: (MEAL_TYPES.includes(m?.type) ? m.type : 'Petit-déjeuner') as MealType,
      foods: Array.isArray(m?.foods) ? m.foods.map(parseFood) : [],
    }))
  }

  // AI shape: { repas: { petit_dejeuner: [...], dejeuner: [...], ... } }
  if (raw.repas && typeof raw.repas === 'object') {
    return Object.entries(AI_MEAL_KEY_TO_TYPE).map(([aiKey, type]) => ({
      type,
      foods: Array.isArray(raw.repas[aiKey]) ? raw.repas[aiKey].map(parseFood) : [],
    }))
  }

  return []
}

/** Extract totals from AI shape (Coach doesn't have them). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTotals(raw: any): DayTotals | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const hasAny =
    raw.total_kcal != null || raw.total_protein != null ||
    raw.total_carbs != null || raw.total_fat != null
  if (!hasAny) return undefined
  return {
    kcal: num(raw.total_kcal),
    prot: num(raw.total_protein),
    carb: num(raw.total_carbs),
    fat:  num(raw.total_fat),
  }
}

/** Compute totals from foods. */
export function computeDayTotals(day: DayPlan): DayTotals {
  const t: DayTotals = { kcal: 0, prot: 0, carb: 0, fat: 0 }
  for (const meal of day.meals) {
    for (const food of meal.foods) {
      t.kcal += food.kcal
      t.prot += food.prot
      t.carb += food.carb
      t.fat  += food.fat
    }
  }
  return t
}

/**
 * Tolerant parser. Accepts:
 *  - Coach format: { lundi: { meals: [...] }, ... }
 *  - AI format:    { lundi: { repas: {...}, total_kcal: ... }, ... }
 *  - Canonical format (passthrough)
 *  - null / undefined / malformed (returns {})
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMealPlan(raw: any): MealPlan {
  if (!raw || typeof raw !== 'object') return {}
  const out: MealPlan = {}
  for (const day of DAYS) {
    const dayRaw = raw[day]
    if (!dayRaw) continue
    const meals = parseMeals(dayRaw)
    if (meals.length === 0) continue
    const totals = parseTotals(dayRaw)
    out[day] = totals ? { meals, totals } : { meals }
  }
  return out
}

/** Get meals for a specific meal type from a parsed day plan. */
export function getMeal(day: DayPlan | undefined, type: MealType): Meal | undefined {
  return day?.meals.find(m => m.type === type)
}
