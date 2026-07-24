import { adaptLegacyNutritionPlan } from './legacy'
import { parseNutritionPlanEnvelope } from './schema'
import type {
  ClientMealPlanRowReadResult,
  MealPlanRowReadResult,
  NutritionPlanEnvelopeV1,
  NutritionPlanReadResult,
  NutritionPlanWarningCode,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(paths: readonly string[]): NutritionPlanReadResult {
  return { status: 'invalid', issue: { code: 'invalid_envelope', paths } }
}

function comparable(envelope: NutritionPlanEnvelopeV1): string {
  return JSON.stringify({
    content: envelope.content,
    targets: envelope.targets,
    totals: envelope.totals,
  })
}

function isReadable(result: NutritionPlanReadResult): result is Extract<
  NutritionPlanReadResult,
  { readonly status: 'canonical' | 'legacy_converted' }
> {
  return result.status === 'canonical' || result.status === 'legacy_converted'
}

export function readNutritionPlanDocument(input: {
  readonly plan?: unknown
  readonly planData?: unknown
}): NutritionPlanReadResult {
  const canonical = input.plan === undefined ? null : parseNutritionPlanEnvelope(input.plan)
  const legacyPlan = canonical || input.plan === undefined ? null : adaptLegacyNutritionPlan(input.plan)
  const legacyData = input.planData === undefined ? null : adaptLegacyNutritionPlan(input.planData)
  if (canonical) {
    if (!legacyData) return { status: 'canonical', envelope: canonical, warnings: canonical.warnings }
    if (legacyData.status !== 'legacy_converted') {
      return legacyData.status === 'legacy_unsupported'
        ? { status: 'conflict', issue: { code: 'document_conflict', paths: ['plan_data'] } }
        : legacyData
    }
    if (comparable(canonical) !== comparable(legacyData.envelope)) {
      return { status: 'conflict', issue: { code: 'document_conflict', paths: ['plan', 'plan_data'] } }
    }
    const warnings: NutritionPlanWarningCode[] = [
      ...new Set<NutritionPlanWarningCode>([...canonical.warnings, 'legacy_duplicate_source']),
    ]
    return { status: 'canonical', envelope: canonical, warnings }
  }
  if (input.plan !== undefined && (!legacyPlan || legacyPlan.status !== 'legacy_converted')) {
    return invalid(['plan'])
  }
  if (legacyPlan?.status === 'legacy_converted' && legacyData?.status === 'legacy_converted') {
    if (comparable(legacyPlan.envelope) !== comparable(legacyData.envelope)) {
      return { status: 'conflict', issue: { code: 'document_conflict', paths: ['plan', 'plan_data'] } }
    }
    return {
      status: 'legacy_converted',
      envelope: legacyPlan.envelope,
      warnings: [...new Set<NutritionPlanWarningCode>([...legacyPlan.warnings, 'legacy_duplicate_source'])],
    }
  }
  if (legacyPlan) return legacyPlan
  if (legacyData) return legacyData
  return { status: 'legacy_unsupported', issue: { code: 'unsupported_legacy', paths: ['document'] } }
}

function nullableString(value: unknown): string | null | undefined {
  return value === undefined || value === null ? value : typeof value === 'string' ? value : undefined
}

function isInvalidNullableString(value: unknown): boolean {
  return value !== undefined && value !== null && typeof value !== 'string'
}

function resolveActivation(row: Record<string, unknown>):
  | { readonly active: boolean | null; readonly warning: boolean }
  | { readonly conflict: true } {
  const active = row.active
  const legacy = row.is_active
  if (active !== undefined && active !== null && typeof active !== 'boolean') return { conflict: true }
  if (legacy !== undefined && legacy !== null && typeof legacy !== 'boolean') return { conflict: true }
  if (typeof active === 'boolean' && typeof legacy === 'boolean' && active !== legacy) return { conflict: true }
  return {
    active: typeof active === 'boolean' ? active : typeof legacy === 'boolean' ? legacy : null,
    warning: legacy !== undefined,
  }
}

export function readMealPlanRow(value: unknown): MealPlanRowReadResult {
  if (!isRecord(value)) return { status: 'invalid', issue: { code: 'invalid_row', paths: ['row'] } }
  const document = readNutritionPlanDocument({ plan: value.plan, planData: value.plan_data })
  if (!isReadable(document)) return document
  const activation = resolveActivation(value)
  if ('conflict' in activation) {
    return { status: 'conflict', issue: { code: 'activation_conflict', paths: ['active', 'is_active'] } }
  }
  const id = nullableString(value.id)
  const userId = nullableString(value.user_id)
  const createdBy = nullableString(value.created_by)
  const name = nullableString(value.name)
  const createdAt = nullableString(value.created_at)
  if ([value.id, value.user_id, value.created_by, value.name, value.created_at].some(isInvalidNullableString)) {
    return { status: 'invalid', issue: { code: 'invalid_row', paths: ['row'] } }
  }
  return {
    ...document,
    warnings: activation.warning
      ? [...new Set([...document.warnings, 'activation_alias_present' as const])]
      : document.warnings,
    authority: { id: id ?? null, userId: userId ?? null, createdBy: createdBy ?? null, name: name ?? null, active: activation.active, createdAt: createdAt ?? null },
  }
}

export function readClientMealPlanRow(value: unknown): ClientMealPlanRowReadResult {
  if (!isRecord(value)) return { status: 'invalid', issue: { code: 'invalid_row', paths: ['row'] } }
  const document = readNutritionPlanDocument({ plan: value.plan })
  if (!isReadable(document)) return document
  const id = nullableString(value.id)
  const clientId = nullableString(value.client_id)
  const coachId = nullableString(value.coach_id)
  const createdAt = nullableString(value.created_at)
  const updatedAt = nullableString(value.updated_at)
  if ([value.id, value.client_id, value.coach_id, value.created_at, value.updated_at].some(isInvalidNullableString)) {
    return { status: 'invalid', issue: { code: 'invalid_row', paths: ['row'] } }
  }
  return {
    ...document,
    authority: { id: id ?? null, clientId: clientId ?? null, coachId: coachId ?? null, createdAt: createdAt ?? null, updatedAt: updatedAt ?? null },
  }
}
