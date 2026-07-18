export type NutrientKey = 'kcal' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'

export interface NutritionValues {
  readonly kcal: number | null
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
  readonly fiberG: number | null
}

export type NutritionBasis =
  | { readonly kind: 'per_100_g' }
  | { readonly kind: 'per_100_ml' }
  | { readonly kind: 'per_portion'; readonly portionId: string }
  | { readonly kind: 'per_unit'; readonly unitId: string }

export type NutritionQuantity =
  | { readonly kind: 'mass'; readonly grams: number }
  | { readonly kind: 'volume'; readonly milliliters: number }
  | { readonly kind: 'portion'; readonly portionId: string; readonly count: number }
  | { readonly kind: 'unit'; readonly unitId: string; readonly count: number }

export interface NutritionDensity {
  readonly basis: NutritionBasis
  readonly values: NutritionValues
}

export type NutritionIssueCode =
  | 'invalid_nutrient_value'
  | 'invalid_quantity'
  | 'incompatible_basis'
  | 'unknown_nutrient_value'
  | 'empty_aggregate'

export interface NutritionIssue {
  readonly code: NutritionIssueCode
  readonly path: string
}

export type NutritionCalculationResult =
  | {
      readonly status: 'complete' | 'partial'
      readonly values: NutritionValues
      readonly issues: readonly NutritionIssue[]
    }
  | {
      readonly status: 'unavailable' | 'invalid'
      readonly values: NutritionValues
      readonly issues: readonly NutritionIssue[]
    }

export interface NutritionAggregateInput {
  readonly id: string
  readonly result: NutritionCalculationResult
}

export type MacroEnergyResult =
  | { readonly status: 'complete'; readonly kcal: number; readonly issues: readonly [] }
  | { readonly status: 'unavailable' | 'invalid'; readonly kcal: null; readonly issues: readonly NutritionIssue[] }

export type DeclaredEnergyComparison =
  | { readonly status: 'within_tolerance' | 'outside_tolerance'; readonly differenceKcal: number; readonly toleranceKcal: number }
  | { readonly status: 'indeterminate'; readonly differenceKcal: null; readonly toleranceKcal: number }
  | { readonly status: 'invalid'; readonly differenceKcal: null; readonly toleranceKcal: number }

const NUTRIENT_KEYS: readonly NutrientKey[] = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG']

const UNKNOWN_VALUES: NutritionValues = Object.freeze({
  kcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
})

function issue(code: NutritionIssueCode, path: string): NutritionIssue {
  return { code, path }
}

function validateValues(values: NutritionValues, path: string): readonly NutritionIssue[] {
  const issues: NutritionIssue[] = []
  for (const key of NUTRIENT_KEYS) {
    const value = values[key]
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      issues.push(issue('invalid_nutrient_value', `${path}.${key}`))
    }
  }
  return issues
}

function quantityFactor(basis: NutritionBasis, quantity: NutritionQuantity): number | null {
  if (basis.kind === 'per_100_g' && quantity.kind === 'mass') return quantity.grams / 100
  if (basis.kind === 'per_100_ml' && quantity.kind === 'volume') return quantity.milliliters / 100
  if (basis.kind === 'per_portion' && quantity.kind === 'portion' && basis.portionId === quantity.portionId) return quantity.count
  if (basis.kind === 'per_unit' && quantity.kind === 'unit' && basis.unitId === quantity.unitId) return quantity.count
  return null
}

function quantityValue(quantity: NutritionQuantity): number {
  if (quantity.kind === 'mass') return quantity.grams
  if (quantity.kind === 'volume') return quantity.milliliters
  return quantity.count
}

function hasUnknown(values: NutritionValues): boolean {
  return NUTRIENT_KEYS.some(key => values[key] === null)
}

export function calculateNutritionAmount(
  density: NutritionDensity,
  quantity: NutritionQuantity,
): NutritionCalculationResult {
  const densityIssues = validateValues(density.values, 'density.values')
  if (densityIssues.length > 0) {
    return { status: 'invalid', values: UNKNOWN_VALUES, issues: densityIssues }
  }

  const amount = quantityValue(quantity)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'invalid', values: UNKNOWN_VALUES, issues: [issue('invalid_quantity', 'quantity')] }
  }

  const factor = quantityFactor(density.basis, quantity)
  if (factor === null) {
    return { status: 'unavailable', values: UNKNOWN_VALUES, issues: [issue('incompatible_basis', 'quantity')] }
  }

  const values: NutritionValues = {
    kcal: density.values.kcal === null ? null : density.values.kcal * factor,
    proteinG: density.values.proteinG === null ? null : density.values.proteinG * factor,
    carbsG: density.values.carbsG === null ? null : density.values.carbsG * factor,
    fatG: density.values.fatG === null ? null : density.values.fatG * factor,
    fiberG: density.values.fiberG === null ? null : density.values.fiberG * factor,
  }
  const issues = NUTRIENT_KEYS
    .filter(key => values[key] === null)
    .map(key => issue('unknown_nutrient_value', `values.${key}`))

  return { status: hasUnknown(values) ? 'partial' : 'complete', values, issues }
}

export function aggregateNutrition(
  entries: readonly NutritionAggregateInput[],
): NutritionCalculationResult {
  if (entries.length === 0) {
    return { status: 'unavailable', values: UNKNOWN_VALUES, issues: [issue('empty_aggregate', 'entries')] }
  }

  const invalid = entries.find(entry => entry.result.status === 'invalid')
  if (invalid) {
    return {
      status: 'invalid',
      values: UNKNOWN_VALUES,
      issues: invalid.result.issues.map(entryIssue => ({ ...entryIssue, path: `entries.${invalid.id}.${entryIssue.path}` })),
    }
  }

  const values = Object.fromEntries(NUTRIENT_KEYS.map(key => {
    const nutrientValues = entries.map(entry => entry.result.values[key])
    if (nutrientValues.some(value => value === null)) return [key, null]
    return [key, nutrientValues.reduce<number>((sum, value) => sum + (value as number), 0)]
  })) as unknown as NutritionValues

  const issues: NutritionIssue[] = []
  for (const entry of entries) {
    for (const entryIssue of entry.result.issues) {
      issues.push({ ...entryIssue, path: `entries.${entry.id}.${entryIssue.path}` })
    }
    if (entry.result.status === 'unavailable' && entry.result.issues.length === 0) {
      issues.push(issue('incompatible_basis', `entries.${entry.id}`))
    }
  }
  for (const key of NUTRIENT_KEYS) {
    if (values[key] === null && !issues.some(entryIssue => entryIssue.path.endsWith(key))) {
      issues.push(issue('unknown_nutrient_value', `values.${key}`))
    }
  }

  return {
    status: entries.every(entry => entry.result.status === 'complete') && !hasUnknown(values) ? 'complete' : 'partial',
    values,
    issues,
  }
}

export function calculateMacroEnergy(input: {
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
}): MacroEnergyResult {
  const values = [input.proteinG, input.carbsG, input.fatG]
  if (values.some(value => value !== null && (!Number.isFinite(value) || value < 0))) {
    return { status: 'invalid', kcal: null, issues: [issue('invalid_nutrient_value', 'macros')] }
  }
  if (values.some(value => value === null)) {
    return { status: 'unavailable', kcal: null, issues: [issue('unknown_nutrient_value', 'macros')] }
  }
  return {
    status: 'complete',
    kcal: (input.proteinG as number) * 4 + (input.carbsG as number) * 4 + (input.fatG as number) * 9,
    issues: [],
  }
}

export function compareDeclaredEnergy(input: {
  readonly declaredKcal: number | null
  readonly macroEnergy: MacroEnergyResult
  readonly toleranceKcal: number
}): DeclaredEnergyComparison {
  if (!Number.isFinite(input.toleranceKcal) || input.toleranceKcal < 0) {
    return { status: 'invalid', differenceKcal: null, toleranceKcal: input.toleranceKcal }
  }
  if (input.declaredKcal !== null && (!Number.isFinite(input.declaredKcal) || input.declaredKcal < 0)) {
    return { status: 'invalid', differenceKcal: null, toleranceKcal: input.toleranceKcal }
  }
  if (input.declaredKcal === null || input.macroEnergy.status !== 'complete') {
    return { status: 'indeterminate', differenceKcal: null, toleranceKcal: input.toleranceKcal }
  }
  const differenceKcal = Math.abs(input.declaredKcal - input.macroEnergy.kcal)
  return {
    status: differenceKcal <= input.toleranceKcal ? 'within_tolerance' : 'outside_tolerance',
    differenceKcal,
    toleranceKcal: input.toleranceKcal,
  }
}

export function roundNutritionForDisplay(
  values: NutritionValues,
  options: { readonly kcalDecimals?: number; readonly gramDecimals?: number } = {},
): NutritionValues {
  const kcalDecimals = options.kcalDecimals ?? 0
  const gramDecimals = options.gramDecimals ?? 1
  if (![kcalDecimals, gramDecimals].every(value => Number.isInteger(value) && value >= 0 && value <= 10)) {
    return { ...UNKNOWN_VALUES }
  }
  const round = (value: number | null, decimals: number): number | null => {
    if (value === null) return null
    const factor = 10 ** decimals
    return Math.round((value + Number.EPSILON) * factor) / factor
  }
  return {
    kcal: round(values.kcal, kcalDecimals),
    proteinG: round(values.proteinG, gramDecimals),
    carbsG: round(values.carbsG, gramDecimals),
    fatG: round(values.fatG, gramDecimals),
    fiberG: round(values.fiberG, gramDecimals),
  }
}
