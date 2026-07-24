import type { TablesInsert } from '@/lib/supabase/database.types'

import {
  readSavedMealFoodValues,
  type SavedMealFoodSnapshotInput,
} from './saved-meal-snapshot'

export type DailyFoodLogInsert = TablesInsert<'daily_food_logs'>

export interface SavedMealForReuse {
  readonly id: string
  readonly foods?: readonly SavedMealFoodSnapshotInput[] | null
}

export type SavedMealReuseResult =
  | { readonly status: 'ready'; readonly inserts: readonly DailyFoodLogInsert[] }
  | { readonly status: 'alias_conflict'; readonly code: 'conflicting_nutrients' }
  | {
    readonly status: 'invalid'
    readonly code: 'invalid_date' | 'missing_meal_type' | 'invalid_food'
  }
  | {
    readonly status: 'unsupported'
    readonly code: 'empty_meal' | 'missing_required_calories'
  }

export type SavedMealReuseWriteResult =
  | { readonly status: 'succeeded'; readonly insertedCount: number }
  | { readonly status: 'write_failed'; readonly insertedCount: 0 }

export const SAVED_MEAL_REUSE_CONFLICT_MESSAGE =
  'Ce repas contient des valeurs nutritionnelles contradictoires. Corrige-le avant de le réutiliser.'

export const SAVED_MEAL_REUSE_INVALID_MESSAGE =
  'Ce repas ne peut pas être réutilisé avec les informations disponibles.'

export const SAVED_MEAL_REUSE_WRITE_ERROR_MESSAGE =
  'Le repas n’a pas pu être ajouté au journal. Réessaie dans un instant.'

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function quantity(food: SavedMealFoodSnapshotInput): number {
  const observed = food.quantity ?? food.quantity_g
  return observed === undefined || observed === null ? 100 : observed
}

export function prepareSavedMealReuse(input: {
  readonly meal: SavedMealForReuse
  readonly userId: string
  readonly targetDate: string
  readonly targetMealType: string
}): SavedMealReuseResult {
  if (!isValidIsoDate(input.targetDate)) {
    return { status: 'invalid', code: 'invalid_date' }
  }
  if (!input.targetMealType.trim()) {
    return { status: 'invalid', code: 'missing_meal_type' }
  }
  const foods = input.meal.foods ?? []
  if (foods.length === 0) {
    return { status: 'unsupported', code: 'empty_meal' }
  }

  const inserts: DailyFoodLogInsert[] = []
  for (const food of foods) {
    if (typeof food.name !== 'string' || !food.name.trim()) {
      return { status: 'invalid', code: 'invalid_food' }
    }
    const amount = quantity(food)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 'invalid', code: 'invalid_food' }
    }
    const snapshot = readSavedMealFoodValues(food)
    if (!snapshot.ok) {
      return snapshot.kind === 'alias_conflict'
        ? { status: 'alias_conflict', code: 'conflicting_nutrients' }
        : { status: 'invalid', code: 'invalid_food' }
    }
    if (snapshot.values.kcal === null) {
      return { status: 'unsupported', code: 'missing_required_calories' }
    }
    inserts.push({
      user_id: input.userId,
      date: input.targetDate,
      meal_type: input.targetMealType,
      custom_name: food.name,
      quantity_g: amount,
      calories: snapshot.values.kcal,
      protein: snapshot.values.proteinG,
      carbs: snapshot.values.carbsG,
      fat: snapshot.values.fatG,
    })
  }
  return { status: 'ready', inserts: Object.freeze(inserts) }
}

export async function persistSavedMealReuse(
  prepared: Extract<SavedMealReuseResult, { readonly status: 'ready' }>,
  insertBatch: (
    inserts: readonly DailyFoodLogInsert[],
  ) => Promise<{ readonly error: unknown | null }>,
): Promise<SavedMealReuseWriteResult> {
  const { error } = await insertBatch(prepared.inserts)
  return error
    ? { status: 'write_failed', insertedCount: 0 }
    : { status: 'succeeded', insertedCount: prepared.inserts.length }
}

export function savedMealReuseMessage(
  result: Exclude<SavedMealReuseResult, { readonly status: 'ready' }> | 'write_failed',
): string {
  if (result === 'write_failed') return SAVED_MEAL_REUSE_WRITE_ERROR_MESSAGE
  return result.status === 'alias_conflict'
    ? SAVED_MEAL_REUSE_CONFLICT_MESSAGE
    : SAVED_MEAL_REUSE_INVALID_MESSAGE
}
