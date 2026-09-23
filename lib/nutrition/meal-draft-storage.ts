import { mealDraftRows, type MealDraftFood } from './meal-draft'

export interface StoredMealDraft {
  version: 1
  userId: string
  date: string
  mealType: string
  foods: MealDraftFood[]
  submitted: boolean
}

export function mealDraftKey(userId: string, date: string, mealType: string) {
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['petit_dejeuner','dejeuner','collation','diner'].includes(mealType)) throw new Error('INVALID_MEAL_CONTEXT')
  return `moovx_meal_draft_v1:${encodeURIComponent(userId)}:${date}:${mealType}`
}

export function readMealDraft(raw: string | null, userId: string, date: string, mealType: string): StoredMealDraft | null {
  if (raw === null) return null
  const draft = JSON.parse(raw) as StoredMealDraft
  if (draft?.version !== 1 || draft.userId !== userId || draft.date !== date || draft.mealType !== mealType || typeof draft.submitted !== 'boolean' || !Array.isArray(draft.foods)) throw new Error('INVALID_STORED_MEAL')
  const ids = new Set<string>()
  for (const food of draft.foods) {
    if (!food || typeof food.id !== 'string' || !food.id || ids.has(food.id) || typeof food.name !== 'string' || !food.name.trim() ||
      !Number.isFinite(food.baseQuantity) || food.baseQuantity <= 0 ||
      [food.calories,food.protein,food.carbs,food.fat].some(value => !Number.isFinite(value) || value < 0) ||
      (food.quantity !== null && !Number.isFinite(food.quantity))) throw new Error('INVALID_STORED_FOOD')
    ids.add(food.id)
    // JSON encodes an empty number input (NaN) as null. Preserve it as empty.
    if (food.quantity === null) food.quantity = NaN
  }
  if (draft.submitted) mealDraftRows(draft.foods,userId,date,mealType)
  return draft
}

/** Refuse stale writers; never overwrite another mounted editor's snapshot. */
export function writeMealDraft(storage: Storage, key: string, expected: string | null, draft: StoredMealDraft | null): string | null {
  if (storage.getItem(key) !== expected) throw new Error('MEAL_DRAFT_CONFLICT')
  const raw = draft ? JSON.stringify(draft) : null
  if (raw === null) storage.removeItem(key)
  else storage.setItem(key,raw)
  return raw
}
