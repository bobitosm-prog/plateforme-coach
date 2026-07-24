import type { NutrientKey, NutritionValues } from './invariants'
import {
  compareLegacyCanonicalTotals,
  LEGACY_NUTRIENT_ALIASES,
  type LegacyNutritionEntry,
  type TotalComparisonStatus,
} from './legacy-total-comparison'

export const NUTRITION_LEGACY_SNAPSHOT_VERSION = 1 as const
export const NUTRITION_LEGACY_SNAPSHOT_KEY = '_nutrition_snapshot' as const

export type NutritionSnapshotSource =
  | 'saved_meal'
  | 'daily_food_log'
  | 'meal_plan'
  | 'recipe'
  | 'generated_plan'
  | 'imported_meal'
  | 'legacy_unknown'

export type NutritionTotalProvenance =
  | 'calculated'
  | 'declared'
  | 'imported'
  | 'calculated_and_declared'
  | 'legacy_unknown'

export interface NutritionLegacySnapshotV1 {
  readonly kind: 'nutrition_legacy_snapshot'
  readonly schemaVersion: typeof NUTRITION_LEGACY_SNAPSHOT_VERSION
  readonly source: NutritionSnapshotSource
  readonly totalProvenance: NutritionTotalProvenance
  readonly observedAliases: Readonly<Partial<Record<NutrientKey, readonly string[]>>>
  readonly values: NutritionValues
  readonly calculated: NutritionValues | null
  readonly declared: NutritionValues | null
  readonly concordance: TotalComparisonStatus | null
}

export type NutritionLegacySnapshotResult =
  | { readonly ok: true; readonly snapshot: NutritionLegacySnapshotV1 }
  | {
    readonly ok: false
    readonly kind: 'alias_conflict' | 'invalid_value' | 'invalid_snapshot'
    readonly paths: readonly string[]
  }

export type VersionedLegacyNutritionEntry = LegacyNutritionEntry & {
  readonly [NUTRITION_LEGACY_SNAPSHOT_KEY]: NutritionLegacySnapshotV1
}

type AliasValue = {
  readonly alias: keyof LegacyNutritionEntry
  readonly value: number
}

const NUTRIENTS: readonly NutrientKey[] = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG']
const SOURCES: readonly NutritionSnapshotSource[] = [
  'saved_meal',
  'daily_food_log',
  'meal_plan',
  'recipe',
  'generated_plan',
  'imported_meal',
  'legacy_unknown',
]
const PROVENANCES: readonly NutritionTotalProvenance[] = [
  'calculated',
  'declared',
  'imported',
  'calculated_and_declared',
  'legacy_unknown',
]
const CONCORDANCE_STATUSES: readonly TotalComparisonStatus[] = [
  'equivalent',
  'within_tolerance',
  'divergent',
  'partial',
  'unavailable',
  'invalid',
]
const EMPTY_VALUES: NutritionValues = Object.freeze({
  kcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function aliasValues(entry: LegacyNutritionEntry, nutrient: NutrientKey): readonly AliasValue[] {
  return LEGACY_NUTRIENT_ALIASES[nutrient].flatMap(alias => {
    const value = entry[alias]
    return value === undefined || value === null ? [] : [{ alias, value }]
  })
}

function resolveLegacyValues(entry: LegacyNutritionEntry): NutritionLegacySnapshotResult | {
  readonly ok: true
  readonly values: NutritionValues
  readonly observedAliases: Readonly<Partial<Record<NutrientKey, readonly string[]>>>
} {
  const paths: string[] = []
  const conflicts: string[] = []
  const values: Partial<Record<NutrientKey, number | null>> = {}
  const observedAliases: Partial<Record<NutrientKey, readonly string[]>> = {}
  for (const nutrient of NUTRIENTS) {
    const observed = aliasValues(entry, nutrient)
    observedAliases[nutrient] = Object.freeze(observed.map(item => item.alias))
    for (const item of observed) {
      if (!Number.isFinite(item.value) || item.value < 0) paths.push(`legacy.${String(item.alias)}`)
    }
    const distinct = [...new Set(observed.map(item => item.value))]
    if (distinct.length > 1) conflicts.push(`legacy.${nutrient}`)
    values[nutrient] = observed[0]?.value ?? null
  }
  if (paths.length > 0) return { ok: false, kind: 'invalid_value', paths }
  if (conflicts.length > 0) return { ok: false, kind: 'alias_conflict', paths: conflicts }
  return {
    ok: true,
    values: values as NutritionValues,
    observedAliases: Object.freeze(observedAliases),
  }
}

function canonicalResult(values: NutritionValues) {
  const known = NUTRIENTS.filter(key => values[key] !== null)
  return {
    status: known.length === 0 ? 'unavailable' as const : known.length === NUTRIENTS.length ? 'complete' as const : 'partial' as const,
    values,
    issues: [],
  }
}

function declaredTotals(values: NutritionValues) {
  return {
    total_calories: values.kcal,
    total_proteins: values.proteinG,
    total_carbs: values.carbsG,
    total_fats: values.fatG,
    total_fibers: values.fiberG,
  }
}

function compareTotals(
  calculated: NutritionValues | null,
  declared: NutritionValues | null,
): TotalComparisonStatus | null {
  if (!calculated || !declared) return null
  return compareLegacyCanonicalTotals({
    legacy: { format: 'declared_totals', totals: declaredTotals(declared) },
    canonical: canonicalResult(calculated),
  }).status
}

export function buildNutritionLegacySnapshot(input: {
  readonly source: NutritionSnapshotSource
  readonly totalProvenance: NutritionTotalProvenance
  readonly legacy: LegacyNutritionEntry
  readonly calculated?: NutritionValues | null
  readonly declared?: NutritionValues | null
}): NutritionLegacySnapshotResult {
  const resolved = resolveLegacyValues(input.legacy)
  if (!resolved.ok || !('observedAliases' in resolved)) return resolved
  const calculated = input.calculated ?? null
  const declared = input.declared ?? null
  return {
    ok: true,
    snapshot: Object.freeze({
      kind: 'nutrition_legacy_snapshot',
      schemaVersion: NUTRITION_LEGACY_SNAPSHOT_VERSION,
      source: input.source,
      totalProvenance: input.totalProvenance,
      observedAliases: resolved.observedAliases,
      values: Object.freeze({ ...resolved.values }),
      calculated: calculated ? Object.freeze({ ...calculated }) : null,
      declared: declared ? Object.freeze({ ...declared }) : null,
      concordance: compareTotals(calculated, declared),
    }),
  }
}

export function projectNutritionSnapshotToLegacy(
  legacy: LegacyNutritionEntry,
  snapshot: NutritionLegacySnapshotV1,
): VersionedLegacyNutritionEntry {
  return Object.freeze({ ...legacy, [NUTRITION_LEGACY_SNAPSHOT_KEY]: snapshot })
}

function isNutritionValues(value: unknown): value is NutritionValues {
  if (!isRecord(value)) return false
  return NUTRIENTS.every(key => value[key] === null ||
    (typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0))
}

function isObservedAliases(value: unknown): value is NutritionLegacySnapshotV1['observedAliases'] {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([nutrient, aliases]) => {
    if (!NUTRIENTS.includes(nutrient as NutrientKey) || !Array.isArray(aliases)) return false
    const allowed = LEGACY_NUTRIENT_ALIASES[nutrient as NutrientKey] as readonly string[]
    return aliases.length <= allowed.length &&
      aliases.every(alias => typeof alias === 'string' && allowed.includes(alias))
  })
}

function parseVersionedSnapshot(value: unknown): NutritionLegacySnapshotResult {
  if (!isRecord(value) ||
    value.kind !== 'nutrition_legacy_snapshot' ||
    value.schemaVersion !== NUTRITION_LEGACY_SNAPSHOT_VERSION ||
    !SOURCES.includes(value.source as NutritionSnapshotSource) ||
    !PROVENANCES.includes(value.totalProvenance as NutritionTotalProvenance) ||
    !isObservedAliases(value.observedAliases) ||
    !isNutritionValues(value.values) ||
    (value.calculated !== null && !isNutritionValues(value.calculated)) ||
    (value.declared !== null && !isNutritionValues(value.declared)) ||
    (value.concordance !== null && !CONCORDANCE_STATUSES.includes(value.concordance as TotalComparisonStatus))) {
    return { ok: false, kind: 'invalid_snapshot', paths: ['snapshot'] }
  }
  return { ok: true, snapshot: value as unknown as NutritionLegacySnapshotV1 }
}

export function readNutritionLegacySnapshot(
  entry: LegacyNutritionEntry,
): NutritionLegacySnapshotResult {
  const versioned = (entry as LegacyNutritionEntry & Record<string, unknown>)[NUTRITION_LEGACY_SNAPSHOT_KEY]
  if (versioned !== undefined) return parseVersionedSnapshot(versioned)
  return buildNutritionLegacySnapshot({
    source: 'legacy_unknown',
    totalProvenance: 'legacy_unknown',
    legacy: entry,
    calculated: null,
    declared: null,
  })
}

export function emptyNutritionValues(): NutritionValues {
  return EMPTY_VALUES
}
