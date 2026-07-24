export const NUTRITION_PLAN_SCHEMA_VERSION = 1 as const
export const NUTRITION_PLAN_MAX_BYTES = 1024 * 1024
export const NUTRITION_PLAN_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type NutritionPlanDayKey = (typeof NUTRITION_PLAN_DAY_KEYS)[number]
export type NutritionPlanNutrientKey = 'energyKcal' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'
export type NutritionPlanWarningCode =
  | 'legacy_format'
  | 'legacy_duplicate_source'
  | 'legacy_day_missing'
  | 'legacy_coach_day_omitted'
  | 'legacy_ai_empty_day'
  | 'legacy_total_without_provenance'
  | 'activation_alias_present'

export interface NutritionPlanKnownValue {
  readonly status: 'known'
  readonly value: number
  readonly provenance: 'declared' | 'generated' | 'imported' | 'legacy_unknown'
}

export interface NutritionPlanUnknownValue {
  readonly status: 'unknown' | 'not_applicable'
  readonly value: null
  readonly provenance: 'declared' | 'generated' | 'imported' | 'legacy_unknown'
}

export type NutritionPlanTargetValue = NutritionPlanKnownValue | NutritionPlanUnknownValue
export type NutritionPlanValues = Readonly<Record<NutritionPlanNutrientKey, number | null>>

export interface NutritionPlanItemV1 {
  readonly id: string
  readonly kind: 'food'
  readonly label: string
  readonly quantity: {
    readonly grams: number | null
    readonly original: string | number | null
  }
  readonly nutrition: NutritionPlanValues
  readonly observedAliases: readonly string[]
}

export interface NutritionPlanMealV1 {
  readonly id: string
  readonly type: string
  readonly items: readonly NutritionPlanItemV1[]
}

export interface NutritionPlanDayV1 {
  readonly day: NutritionPlanDayKey
  readonly sourceStatus: 'observed' | 'missing' | 'omitted_legacy'
  readonly meals: readonly NutritionPlanMealV1[]
  readonly declaredTotals: NutritionPlanTotalV1 | null
}

export interface NutritionPlanTotalV1 {
  readonly energyKcal: number | null
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
  readonly fiberG: number | null
}

export interface NutritionPlanEnvelopeV1 {
  readonly schemaVersion: typeof NUTRITION_PLAN_SCHEMA_VERSION
  readonly documentType: 'nutrition_plan'
  readonly planVersion: number
  readonly timezone: string | null
  readonly content: {
    readonly days: readonly NutritionPlanDayV1[]
    readonly rules: readonly string[]
    readonly alternatives: readonly string[]
  }
  readonly targets: Readonly<Record<NutritionPlanNutrientKey, NutritionPlanTargetValue>>
  readonly totals: {
    readonly declared: NutritionPlanTotalV1 | null
    readonly calculated: NutritionPlanTotalV1 | null
    readonly calculationStatus: 'complete' | 'partial' | 'unavailable' | 'invalid'
    readonly calculationVersion: string | null
    readonly calculatedAt: string | null
  }
  readonly provenance: {
    readonly source: 'user' | 'coach' | 'ai' | 'import' | 'platform' | 'legacy'
    readonly sourceVersion: string | null
    readonly legacyFormat: string | null
    readonly generatedAt: string | null
  }
  readonly warnings: readonly NutritionPlanWarningCode[]
}

export type NutritionPlanIssueCode =
  | 'invalid_envelope'
  | 'document_too_large'
  | 'unsupported_legacy'
  | 'alias_conflict'
  | 'document_conflict'
  | 'activation_conflict'
  | 'invalid_row'

export interface NutritionPlanIssue {
  readonly code: NutritionPlanIssueCode
  readonly paths: readonly string[]
}

export type NutritionPlanReadResult =
  | {
    readonly status: 'canonical' | 'legacy_converted'
    readonly envelope: NutritionPlanEnvelopeV1
    readonly warnings: readonly NutritionPlanWarningCode[]
  }
  | { readonly status: 'legacy_unsupported' | 'conflict' | 'invalid'; readonly issue: NutritionPlanIssue }

export type MealPlanRowReadResult =
  | {
    readonly status: 'canonical' | 'legacy_converted'
    readonly envelope: NutritionPlanEnvelopeV1
    readonly warnings: readonly NutritionPlanWarningCode[]
    readonly authority: {
      readonly id: string | null
      readonly userId: string | null
      readonly createdBy: string | null
      readonly name: string | null
      readonly active: boolean | null
      readonly createdAt: string | null
    }
  }
  | { readonly status: 'legacy_unsupported' | 'conflict' | 'invalid'; readonly issue: NutritionPlanIssue }

export type ClientMealPlanRowReadResult =
  | {
    readonly status: 'canonical' | 'legacy_converted'
    readonly envelope: NutritionPlanEnvelopeV1
    readonly warnings: readonly NutritionPlanWarningCode[]
    readonly authority: {
      readonly id: string | null
      readonly clientId: string | null
      readonly coachId: string | null
      readonly createdAt: string | null
      readonly updatedAt: string | null
    }
  }
  | { readonly status: 'legacy_unsupported' | 'conflict' | 'invalid'; readonly issue: NutritionPlanIssue }
