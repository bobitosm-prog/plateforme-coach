import { calculateNutritionAmount, type NutritionCalculationResult } from '../../lib/nutrition/invariants'
import type { LegacyTotalSource, TotalComparisonStatus } from '../../lib/nutrition/legacy-total-comparison'

const values = (kcal: number | null, proteinG: number | null, carbsG: number | null, fatG: number | null, fiberG: number | null) => ({ kcal, proteinG, carbsG, fatG, fiberG })
const complete = (kcal: number, proteinG: number, carbsG: number, fatG: number, fiberG: number): NutritionCalculationResult => ({ status: 'complete', values: values(kcal, proteinG, carbsG, fatG, fiberG), issues: [] })

export interface NutritionComparisonFixture {
  readonly name: string
  readonly expected: TotalComparisonStatus
  readonly legacy: LegacyTotalSource
  readonly canonical: NutritionCalculationResult
}

export const nutritionComparisonFixtures: readonly NutritionComparisonFixture[] = [
  { name: '100 g catalogue', expected: 'equivalent', legacy: { format: 'meal_plan_foods', entries: [{ kcal: 200, prot: 10, carb: 20, fat: 8, fiber: 4 }] }, canonical: calculateNutritionAmount({ basis: { kind: 'per_100_g' }, values: values(200, 10, 20, 8, 4) }, { kind: 'mass', grams: 100 }) },
  { name: '100 ml catalogue', expected: 'equivalent', legacy: { format: 'meal_plan_foods', entries: [{ kcal: 47, prot: 3.3, carb: 5, fat: 1.6, fiber: 0 }] }, canonical: calculateNutritionAmount({ basis: { kind: 'per_100_ml' }, values: values(47, 3.3, 5, 1.6, 0) }, { kind: 'volume', milliliters: 100 }) },
  { name: 'portion nommée', expected: 'equivalent', legacy: { format: 'declared_totals', totals: { total_calories: 120, total_proteins: 4, total_carbs: 18, total_fats: 3, total_fibers: 2 } }, canonical: calculateNutritionAmount({ basis: { kind: 'per_portion', portionId: 'bowl' }, values: values(120, 4, 18, 3, 2) }, { kind: 'portion', portionId: 'bowl', count: 1 }) },
  { name: 'unité double', expected: 'equivalent', legacy: { format: 'declared_totals', totals: { total_calories: 180, total_proteins: 12, total_carbs: 2, total_fats: 14, total_fibers: 0 } }, canonical: calculateNutritionAmount({ basis: { kind: 'per_unit', unitId: 'egg' }, values: values(90, 6, 1, 7, 0) }, { kind: 'unit', unitId: 'egg', count: 2 }) },
  { name: 'arrondi historique kcal', expected: 'within_tolerance', legacy: { format: 'daily_food_logs', entries: [{ calories: 63, protein: 2.6, carbs: 11.4, fat: 0.8, fiber: 1.2 }] }, canonical: complete(62.6, 2.6, 11.4, 0.8, 1.2) },
  { name: 'arrondi historique macros', expected: 'within_tolerance', legacy: { format: 'meal_plan_foods', entries: [{ kcal: 250, prot: 10.1, carb: 30, fat: 8, fiber: 3 }] }, canonical: complete(250, 10.04, 30, 8, 3) },
  { name: 'totaux déclarés divergents', expected: 'divergent', legacy: { format: 'declared_totals', totals: { total_calories: 600, total_proteins: 20, total_carbs: 50, total_fats: 20, total_fibers: 5 } }, canonical: complete(500, 20, 50, 20, 5) },
  { name: 'alias sauvegardé ignoré par affichage singulier', expected: 'divergent', legacy: { format: 'saved_meal_foods', entries: [{ calories: 200, protein: 0, carbs: 15, fat: 6, fiber: 2 }] }, canonical: complete(200, 18, 15, 6, 2) },
  { name: 'journal sans fibres', expected: 'partial', legacy: { format: 'daily_food_logs', entries: [{ calories: 400, protein: 30, carbs: 40, fat: 12 }] }, canonical: complete(400, 30, 40, 12, 7) },
  { name: 'zéro legacy masque valeur inconnue', expected: 'partial', legacy: { format: 'saved_meal_foods', entries: [{ calories: 0, protein: 0, carbs: 0, fat: 0 }] }, canonical: { status: 'partial', values: values(null, 0, 0, 0, null), issues: [{ code: 'unknown_nutrient_value', path: 'values.kcal' }] } },
  { name: 'conversion masse volume impossible', expected: 'unavailable', legacy: { format: 'meal_plan_foods', entries: [] }, canonical: calculateNutritionAmount({ basis: { kind: 'per_100_ml' }, values: values(40, 1, 8, 0, 0) }, { kind: 'mass', grams: 100 }) },
  { name: 'valeur legacy négative', expected: 'invalid', legacy: { format: 'daily_food_logs', entries: [{ calories: -1, protein: 1, carbs: 1, fat: 1, fiber: 0 }] }, canonical: complete(10, 1, 1, 1, 0) },
] as const
