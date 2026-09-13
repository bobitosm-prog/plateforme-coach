import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildAthenaClientContext,
  formatAthenaClientContextForPrompt,
  type AthenaClientContextInput,
} from './client-context'

export const ATHENA_GENERATION_PROFILE_COLUMNS = [
  'full_name', 'birth_date', 'current_weight', 'target_weight', 'height', 'gender',
  'tdee', 'calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'objective',
  'activity_level', 'dietary_type', 'training_location', 'home_equipment',
  'meal_preferences', 'onboarding_answers', 'onboarding_completed_at',
].join(', ')

export type AthenaGenerationContextResult =
  | { ok: true; prompt: string }
  | { ok: false }

/**
 * Loads declared profile/onboarding data from the authenticated server client.
 * Generation fails closed when this context cannot be loaded: Athena must not
 * silently generate a generic replacement while claiming personalization.
 */
export async function loadAthenaGenerationContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<AthenaGenerationContextResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(ATHENA_GENERATION_PROFILE_COLUMNS)
    .eq('id', userId)
    .single()

  if (error || !data) return { ok: false }
  const context = buildAthenaClientContext(data as unknown as AthenaClientContextInput)
  return { ok: true, prompt: formatAthenaClientContextForPrompt(context) }
}
