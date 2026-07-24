import {
  readClientMealPlanRow,
  type NutritionPlanEnvelopeV1,
  type NutritionPlanWarningCode,
} from '@/lib/nutrition/plan-envelope'
import type { RepositoryErrorKind, RepositoryResult } from '@/lib/repositories/result'
import type { Json } from '@/lib/supabase/types'

export interface CoachMealPlanReadRow {
  readonly plan: Json
}

export type CoachMealPlanReadErrorCode =
  | 'document_conflict'
  | 'invalid_document'
  | 'unsupported_legacy'
  | 'incomplete_ui_projection'
  | 'repository_failure'

export type CoachMealPlanReadResult =
  | {
    readonly status: 'ready'
    readonly plan: Json
    readonly source: 'canonical' | 'legacy_converted'
    readonly warnings: readonly NutritionPlanWarningCode[]
  }
  | { readonly status: 'absent' }
  | {
    readonly status: 'conflict' | 'invalid' | 'legacy_unsupported' | 'failure'
    readonly error: {
      readonly code: CoachMealPlanReadErrorCode
      readonly repositoryKind?: RepositoryErrorKind
    }
  }

const FRENCH_DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const

function isReadablePlan(
  result: ReturnType<typeof readClientMealPlanRow>,
): result is Extract<
  ReturnType<typeof readClientMealPlanRow>,
  { readonly status: 'canonical' | 'legacy_converted' }
> {
  return result.status === 'canonical' || result.status === 'legacy_converted'
}

function isDisplaySafe(envelope: NutritionPlanEnvelopeV1): boolean {
  return envelope.content.days.every(day => day.meals.every(meal => meal.items.every(item =>
    item.quantity.grams !== null &&
    item.nutrition.energyKcal !== null &&
    item.nutrition.proteinG !== null &&
    item.nutrition.carbsG !== null &&
    item.nutrition.fatG !== null)))
}

export function presentNutritionPlanForLegacyUi(envelope: NutritionPlanEnvelopeV1): Json | null {
  if (!isDisplaySafe(envelope)) return null
  return Object.fromEntries(envelope.content.days.map((day, dayIndex) => [
    FRENCH_DAYS[dayIndex],
    {
      meals: day.meals.map(meal => ({
        type: meal.type,
        foods: meal.items.map(item => ({
          name: item.label,
          qty: item.quantity.grams,
          kcal: item.nutrition.energyKcal,
          prot: item.nutrition.proteinG,
          carb: item.nutrition.carbsG,
          fat: item.nutrition.fatG,
        })),
      })),
    },
  ])) as Json
}

export function readLatestCoachMealPlan(
  result: RepositoryResult<CoachMealPlanReadRow>,
): CoachMealPlanReadResult {
  if (!result.ok) {
    if (result.kind === 'not_found') return { status: 'absent' }
    return {
      status: 'failure',
      error: { code: 'repository_failure', repositoryKind: result.error.kind },
    }
  }

  const read = readClientMealPlanRow({ plan: result.data.plan })
  if (read.status === 'conflict') {
    return { status: 'conflict', error: { code: 'document_conflict' } }
  }
  if (read.status === 'invalid') {
    return { status: 'invalid', error: { code: 'invalid_document' } }
  }
  if (read.status === 'legacy_unsupported') {
    return { status: 'legacy_unsupported', error: { code: 'unsupported_legacy' } }
  }
  if (!isReadablePlan(read)) {
    return { status: 'invalid', error: { code: 'invalid_document' } }
  }

  if (!isDisplaySafe(read.envelope)) {
    return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
  }
  const plan = read.status === 'legacy_converted'
    ? result.data.plan
    : presentNutritionPlanForLegacyUi(read.envelope)
  if (plan === null) {
    return { status: 'invalid', error: { code: 'incomplete_ui_projection' } }
  }
  return {
    status: 'ready',
    plan,
    source: read.status,
    warnings: read.warnings,
  }
}
