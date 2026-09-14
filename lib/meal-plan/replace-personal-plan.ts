import type { SupabaseClient } from '@supabase/supabase-js'

export type PersonalMealPlanReplacement =
  | { ok: true; id: string }
  | { ok: false; stage: 'insert' | 'deactivate' | 'rollback' }

export async function replacePersonalMealPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: unknown,
): Promise<PersonalMealPlanReplacement> {
  const { data: inserted, error: insertError } = await supabase
    .from('meal_plans')
    .insert({ user_id: userId, plan, active: true })
    .select('id,created_at')
    .single()
  if (insertError || !inserted?.id || !inserted.created_at) return { ok: false, stage: 'insert' }

  const { error: deactivateError } = await supabase
    .from('meal_plans')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('active', true)
    .lt('created_at', inserted.created_at)
    .neq('id', inserted.id)
  if (!deactivateError) return { ok: true, id: inserted.id }

  const { error: rollbackError } = await supabase
    .from('meal_plans')
    .update({ active: false })
    .eq('id', inserted.id)
    .eq('user_id', userId)
  return { ok: false, stage: rollbackError ? 'rollback' : 'deactivate' }
}
