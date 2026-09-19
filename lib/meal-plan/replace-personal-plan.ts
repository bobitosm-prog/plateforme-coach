import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivationSnapshot } from './activation-snapshot'
import { ACTIVATION_CONTEXT_KEY, activationSnapshotSchema } from './activation-snapshot'

import { isMissingPersonalMealPlanColumn, type PersonalMealPlanSchema } from './personal-plan-repository'

export type PersonalMealPlanReplacement =
  | { ok: true; id: string }
  | { ok: false; stage: 'insert' | 'conflict' | 'activation' }

export async function replacePersonalMealPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: unknown,
  snapshot?: ActivationSnapshot,
): Promise<PersonalMealPlanReplacement> {
  if (!snapshot && plan && typeof plan === 'object' && ACTIVATION_CONTEXT_KEY in plan) {
    const parsed = activationSnapshotSchema.safeParse((plan as Record<string, unknown>)[ACTIVATION_CONTEXT_KEY])
    if (!parsed.success) return { ok: false, stage: 'activation' }
    snapshot = parsed.data
  }
  if (snapshot) {
    // No legacy fallback: an unavailable transaction must fail closed.
    const { data, error } = await supabase.rpc('activate_personal_meal_plan_v1', {
      p_operation_id: snapshot.operationId, p_plan: plan,
      p_expected_profile_updated_at: snapshot.profileUpdatedAt,
      p_expected_active_plan_id: snapshot.activePlanId,
    })
    if (error || typeof data !== 'string') return { ok: false, stage: error?.code === 'PT409' ? 'conflict' : 'activation' }
    return { ok: true, id: data }
  }
  const insertForSchema = (schema: PersonalMealPlanSchema) => supabase
    .from('meal_plans')
    .insert(schema === 'legacy'
      ? { user_id: userId, plan_data: plan, is_active: true }
      : { user_id: userId, plan, active: true })
    .select('id,created_at')
    .single()

  let schema: PersonalMealPlanSchema = 'legacy'
  let { data: inserted, error: insertError } = await insertForSchema(schema)
  if (insertError && isMissingPersonalMealPlanColumn(insertError)) {
    schema = 'canonical'
    const canonicalInsert = await insertForSchema(schema)
    inserted = canonicalInsert.data
    insertError = canonicalInsert.error
  }
  if (insertError || !inserted?.id || !inserted.created_at) return { ok: false, stage: 'insert' }

  const activeColumn = schema === 'legacy' ? 'is_active' : 'active'

  const { error: deactivateError } = await supabase
    .from('meal_plans')
    .update({ [activeColumn]: false })
    .eq('user_id', userId)
    .eq(activeColumn, true)
    .lt('created_at', inserted.created_at)
    .neq('id', inserted.id)
  // The new row is already valid and readers deterministically select the
  // newest active plan. Cleanup must therefore never invalidate a successful
  // replacement on schemas where UPDATE is temporarily unavailable.
  if (deactivateError) console.warn('[meal-plan] previous-plan cleanup deferred')
  return { ok: true, id: inserted.id }
}
