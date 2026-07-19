import {
  aggregateNutrition,
  type NutrientKey,
  type NutritionCalculationResult,
  type NutritionValues,
} from './invariants'

export type LegacyNutritionFormat =
  | 'daily_food_logs'
  | 'meal_plan_foods'
  | 'saved_meal_foods'
  | 'declared_totals'

export type TotalComparisonStatus =
  | 'equivalent'
  | 'within_tolerance'
  | 'divergent'
  | 'partial'
  | 'unavailable'
  | 'invalid'

export interface LegacyNutritionEntry {
  readonly calories?: number | null
  readonly kcal?: number | null
  readonly protein?: number | null
  readonly proteins?: number | null
  readonly prot?: number | null
  readonly carbs?: number | null
  readonly carb?: number | null
  readonly fat?: number | null
  readonly fats?: number | null
  readonly fiber?: number | null
  readonly fibers?: number | null
}

export interface LegacyDeclaredTotals {
  readonly total_calories?: number | null
  readonly total_proteins?: number | null
  readonly total_carbs?: number | null
  readonly total_fats?: number | null
  readonly total_fibers?: number | null
}

export type LegacyTotalSource =
  | { readonly format: Exclude<LegacyNutritionFormat, 'declared_totals'>; readonly entries: readonly LegacyNutritionEntry[] }
  | { readonly format: 'declared_totals'; readonly totals: LegacyDeclaredTotals }

export interface ComparisonTolerance {
  readonly absoluteKcal: number
  readonly absoluteGrams: number
  readonly relative: number
}

export const DEFAULT_TOTAL_TOLERANCE: ComparisonTolerance = Object.freeze({
  absoluteKcal: 1,
  absoluteGrams: 0.1,
  relative: 0.005,
})

export interface NutrientDifference {
  readonly nutrient: NutrientKey
  readonly status: Exclude<TotalComparisonStatus, 'partial'>
  readonly legacy: number | null
  readonly canonical: number | null
  readonly absoluteDifference: number | null
  readonly relativeDifference: number | null
}

export interface LegacyCanonicalComparison {
  readonly status: TotalComparisonStatus
  readonly format: LegacyNutritionFormat
  readonly legacy: NutritionValues
  readonly canonical: NutritionValues
  readonly nutrients: readonly NutrientDifference[]
  readonly issues: readonly ComparisonIssue[]
}

export type ComparisonIssueCode =
  | 'legacy_unknown_treated_as_zero'
  | 'legacy_invalid_value'
  | 'canonical_partial'
  | 'canonical_unavailable'
  | 'canonical_invalid'
  | 'invalid_tolerance'

export interface ComparisonIssue {
  readonly code: ComparisonIssueCode
  readonly path: string
}

const KEYS: readonly NutrientKey[] = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG']
const UNKNOWN: NutritionValues = Object.freeze({ kcal: null, proteinG: null, carbsG: null, fatG: null, fiberG: null })

function firstDefined(...values: readonly (number | null | undefined)[]): number | null {
  const found = values.find(value => value !== undefined && value !== null)
  return found ?? null
}

function entryValues(entry: LegacyNutritionEntry): NutritionValues {
  return {
    kcal: firstDefined(entry.calories, entry.kcal),
    proteinG: firstDefined(entry.protein, entry.proteins, entry.prot),
    carbsG: firstDefined(entry.carbs, entry.carb),
    fatG: firstDefined(entry.fat, entry.fats),
    fiberG: firstDefined(entry.fiber, entry.fibers),
  }
}

function declaredValues(totals: LegacyDeclaredTotals): NutritionValues {
  return {
    kcal: totals.total_calories ?? null,
    proteinG: totals.total_proteins ?? null,
    carbsG: totals.total_carbs ?? null,
    fatG: totals.total_fats ?? null,
    fiberG: totals.total_fibers ?? null,
  }
}

function legacyTotals(source: LegacyTotalSource): { values: NutritionValues; issues: ComparisonIssue[]; invalid: boolean } {
  const rows = source.format === 'declared_totals' ? [declaredValues(source.totals)] : source.entries.map(entryValues)
  if (rows.length === 0) return { values: UNKNOWN, issues: [], invalid: false }
  const issues: ComparisonIssue[] = []
  let invalid = false
  const values = Object.fromEntries(KEYS.map(key => {
    const nutrientValues = rows.map(row => row[key])
    for (const [index, value] of nutrientValues.entries()) {
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        invalid = true
        issues.push({ code: 'legacy_invalid_value', path: `entries.${index}.${key}` })
      }
    }
    if (nutrientValues.some(value => value === null)) {
      issues.push({ code: 'legacy_unknown_treated_as_zero', path: `values.${key}` })
    }
    return [key, nutrientValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)]
  })) as unknown as NutritionValues
  return { values, issues, invalid }
}

function toleranceValid(value: ComparisonTolerance): boolean {
  return [value.absoluteKcal, value.absoluteGrams, value.relative].every(item => Number.isFinite(item) && item >= 0)
}

function compareNutrient(
  nutrient: NutrientKey,
  legacy: number | null,
  canonical: number | null,
  tolerance: ComparisonTolerance,
): NutrientDifference {
  if (legacy === null || canonical === null) {
    return { nutrient, status: 'unavailable', legacy, canonical, absoluteDifference: null, relativeDifference: null }
  }
  if (![legacy, canonical].every(value => Number.isFinite(value) && value >= 0)) {
    return { nutrient, status: 'invalid', legacy, canonical, absoluteDifference: null, relativeDifference: null }
  }
  const absoluteDifference = Math.abs(legacy - canonical)
  const denominator = Math.max(Math.abs(legacy), Math.abs(canonical))
  const relativeDifference = denominator === 0 ? 0 : absoluteDifference / denominator
  const absoluteTolerance = nutrient === 'kcal' ? tolerance.absoluteKcal : tolerance.absoluteGrams
  const status = absoluteDifference === 0
    ? 'equivalent'
    : absoluteDifference <= absoluteTolerance || relativeDifference <= tolerance.relative
      ? 'within_tolerance'
      : 'divergent'
  return { nutrient, status, legacy, canonical, absoluteDifference, relativeDifference }
}

export function compareLegacyCanonicalTotals(input: {
  readonly legacy: LegacyTotalSource
  readonly canonical: NutritionCalculationResult
  readonly tolerance?: ComparisonTolerance
}): LegacyCanonicalComparison {
  const tolerance = input.tolerance ?? DEFAULT_TOTAL_TOLERANCE
  const legacy = legacyTotals(input.legacy)
  const issues = [...legacy.issues]
  if (!toleranceValid(tolerance)) issues.push({ code: 'invalid_tolerance', path: 'tolerance' })
  if (input.canonical.status === 'invalid') issues.push({ code: 'canonical_invalid', path: 'canonical' })
  if (input.canonical.status === 'unavailable') issues.push({ code: 'canonical_unavailable', path: 'canonical' })
  if (input.canonical.status === 'partial') issues.push({ code: 'canonical_partial', path: 'canonical' })

  const nutrients = KEYS.map(key => compareNutrient(key, legacy.values[key], input.canonical.values[key], tolerance))
  const comparable = nutrients.filter(item => item.status !== 'unavailable')
  let status: TotalComparisonStatus
  if (legacy.invalid || input.canonical.status === 'invalid' || !toleranceValid(tolerance) || nutrients.some(item => item.status === 'invalid')) status = 'invalid'
  else if (comparable.length === 0 || input.canonical.status === 'unavailable') status = 'unavailable'
  else if (issues.some(item => item.code === 'legacy_unknown_treated_as_zero') || input.canonical.status === 'partial' || nutrients.some(item => item.status === 'unavailable')) status = 'partial'
  else if (nutrients.some(item => item.status === 'divergent')) status = 'divergent'
  else if (nutrients.some(item => item.status === 'within_tolerance')) status = 'within_tolerance'
  else status = 'equivalent'

  return { status, format: input.legacy.format, legacy: legacy.values, canonical: input.canonical.values, nutrients, issues }
}

export function aggregateCanonicalTotals(entries: readonly NutritionCalculationResult[]): NutritionCalculationResult {
  return aggregateNutrition(entries.map((result, index) => ({ id: String(index), result })))
}
