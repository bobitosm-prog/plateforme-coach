import type { Json, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types'

import {
  buildSavedMealFoodSnapshots,
  type SavedMealFoodSnapshotInput,
  type SavedMealSnapshotFailure,
} from './saved-meal-snapshot'

export type SavedMealInsert = TablesInsert<'saved_meals'>
export type SavedMealUpdate = TablesUpdate<'saved_meals'>

export type SavedMealWriteFailure = SavedMealSnapshotFailure

export type SavedMealInsertResult =
  | { readonly ok: true; readonly payload: SavedMealInsert }
  | SavedMealWriteFailure

export type SavedMealUpdateResult =
  | { readonly ok: true; readonly payload: SavedMealUpdate }
  | SavedMealWriteFailure

export const SAVED_MEAL_ALIAS_CONFLICT_MESSAGE =
  'Certaines valeurs nutritionnelles se contredisent. Corrige les aliments concernés avant de sauvegarder.'

export const SAVED_MEAL_WRITE_ERROR_MESSAGE =
  'Le repas n’a pas pu être sauvegardé. Réessaie dans un instant.'

function asJson(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Invalid JSON number')
    return value
  }
  if (Array.isArray(value)) return value.map(asJson)
  if (typeof value === 'object') {
    const result: { [key: string]: Json | undefined } = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result[key] = asJson(item)
    }
    return result
  }
  throw new TypeError('Invalid JSON value')
}

function sqlTotals(calculated: {
  readonly kcal: number | null
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
}) {
  return {
    total_calories: calculated.kcal,
    total_protein: calculated.proteinG,
    total_carbs: calculated.carbsG,
    total_fat: calculated.fatG,
  }
}

export function prepareSavedMealInsert(input: {
  readonly userId: string
  readonly name: string
  readonly mealType: string | null
  readonly foods: readonly SavedMealFoodSnapshotInput[]
}): SavedMealInsertResult {
  const snapshot = buildSavedMealFoodSnapshots(input.foods, 'daily_food_log')
  if (!snapshot.ok) return snapshot
  return {
    ok: true,
    payload: {
      user_id: input.userId,
      name: input.name,
      meal_type: input.mealType,
      foods: asJson(snapshot.foods),
      ...sqlTotals(snapshot.calculatedTotals),
    },
  }
}

export function prepareEmptySavedMealInsert(input: {
  readonly userId: string
  readonly name: string
  readonly mealType: string | null
}): SavedMealInsert {
  return {
    user_id: input.userId,
    name: input.name,
    meal_type: input.mealType,
    foods: [],
  }
}

export function prepareSavedMealUpdate(
  foods: readonly SavedMealFoodSnapshotInput[],
): SavedMealUpdateResult {
  const snapshot = buildSavedMealFoodSnapshots(foods, 'saved_meal')
  if (!snapshot.ok) return snapshot
  return {
    ok: true,
    payload: {
      foods: asJson(snapshot.foods),
      ...sqlTotals(snapshot.calculatedTotals),
    },
  }
}

export function savedMealWriteMessage(
  failure: SavedMealWriteFailure | 'persistence_error',
): string {
  return failure === 'persistence_error'
    ? SAVED_MEAL_WRITE_ERROR_MESSAGE
    : failure.kind === 'alias_conflict'
      ? SAVED_MEAL_ALIAS_CONFLICT_MESSAGE
      : SAVED_MEAL_WRITE_ERROR_MESSAGE
}
