import type { SupabaseClient } from '@supabase/supabase-js'

export type PersonalTrainingProgramInput = {
  name: string
  description: string
  days: unknown[]
  source: string
}

export type PersonalTrainingProgramReplacement =
  | { ok: true; id: string }
  | { ok: false; stage: 'insert' | 'deactivate' | 'rollback' }

export async function replacePersonalTrainingProgram(
  supabase: SupabaseClient,
  userId: string,
  program: PersonalTrainingProgramInput,
): Promise<PersonalTrainingProgramReplacement> {
  const { data: inserted, error: insertError } = await supabase
    .from('custom_programs')
    .insert({ user_id: userId, ...program, is_active: true })
    .select('id,created_at')
    .single()
  if (insertError || !inserted?.id || !inserted.created_at) return { ok: false, stage: 'insert' }

  const { error: deactivateError } = await supabase
    .from('custom_programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .lt('created_at', inserted.created_at)
    .neq('id', inserted.id)
  if (!deactivateError) return { ok: true, id: inserted.id }

  const { error: rollbackError } = await supabase
    .from('custom_programs')
    .update({ is_active: false })
    .eq('id', inserted.id)
    .eq('user_id', userId)
  return { ok: false, stage: rollbackError ? 'rollback' : 'deactivate' }
}
