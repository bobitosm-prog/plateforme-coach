import type { SupabaseClient } from '@supabase/supabase-js'

import { isMissingPersonalMealPlanColumn, type PersonalMealPlanSchema } from './personal-plan-repository'

export type PersonalMealPlanReplacement =
  | { ok: true; id: string }
  | { ok: false; stage: 'insert' | 'deactivate' | 'rollback' }

export async function replacePersonalMealPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: unknown,
): Promise<PersonalMealPlanReplacement> {
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
  if (!deactivateError) return { ok: true, id: inserted.id }

  const { error: rollbackError } = await supabase
    .from('meal_plans')
    .update({ [activeColumn]: false })
    .eq('id', inserted.id)
    .eq('user_id', userId)
  return { ok: false, stage: rollbackError ? 'rollback' : 'deactivate' }
}
