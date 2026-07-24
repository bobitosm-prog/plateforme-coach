import type { NutritionValues } from './invariants'
import type { LegacyNutritionEntry } from './legacy-total-comparison'
import {
  buildNutritionLegacySnapshot,
  projectNutritionSnapshotToLegacy,
  readNutritionLegacySnapshot,
  type NutritionSnapshotSource,
  type VersionedLegacyNutritionEntry,
} from './legacy-snapshot'

export type SavedMealFoodSnapshotInput = LegacyNutritionEntry & {
  readonly name?: string | null
  readonly quantity?: number | null
  readonly quantity_g?: number | null
}

export type SavedMealSnapshotFailure = {
  readonly ok: false
  readonly kind: 'alias_conflict' | 'invalid_value' | 'invalid_snapshot'
  readonly paths: readonly string[]
}

export type SavedMealSnapshotSuccess = {
  readonly ok: true
  readonly foods: readonly (SavedMealFoodSnapshotInput & VersionedLegacyNutritionEntry)[]
  readonly calculatedTotals: NutritionValues
}

function aggregate(values: readonly NutritionValues[]): NutritionValues {
  const keys = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG'] as const
  return Object.fromEntries(keys.map(key => [
    key,
    values.every(value => value[key] !== null)
      ? values.reduce((sum, value) => sum + (value[key] ?? 0), 0)
      : null,
  ])) as unknown as NutritionValues
}

export function buildSavedMealFoodSnapshots(
  foods: readonly SavedMealFoodSnapshotInput[],
  source: Extract<NutritionSnapshotSource, 'saved_meal' | 'daily_food_log' | 'imported_meal'>,
): SavedMealSnapshotSuccess | SavedMealSnapshotFailure {
  const versioned: (SavedMealFoodSnapshotInput & VersionedLegacyNutritionEntry)[] = []
  const values: NutritionValues[] = []
  const totalProvenance = source === 'imported_meal' ? 'imported' : 'calculated'
  for (const [index, food] of foods.entries()) {
    const initial = buildNutritionLegacySnapshot({
      source,
      totalProvenance,
      legacy: food,
    })
    if (!initial.ok) return { ...initial, paths: initial.paths.map(path => `foods.${index}.${path}`) }
    const result = buildNutritionLegacySnapshot({
      source,
      totalProvenance,
      legacy: food,
      calculated: initial.snapshot.values,
    })
    if (!result.ok) return { ...result, paths: result.paths.map(path => `foods.${index}.${path}`) }
    values.push(result.snapshot.values)
    versioned.push({
      ...food,
      ...projectNutritionSnapshotToLegacy(food, result.snapshot),
    })
  }
  return {
    ok: true,
    foods: Object.freeze(versioned),
    calculatedTotals: Object.freeze(aggregate(values)),
  }
}

export function readSavedMealFoodValues(
  food: SavedMealFoodSnapshotInput,
) {
  const result = readNutritionLegacySnapshot(food)
  return result.ok
    ? { ok: true as const, values: result.snapshot.values }
    : result
}
