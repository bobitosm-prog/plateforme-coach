import type { SupabaseClient } from '@supabase/supabase-js'

export type PersonalMealPlanSchema = 'legacy' | 'canonical'

export interface PersonalMealPlanRow {
  id: string
  user_id?: string
  plan: unknown
  active: boolean
  created_at?: string | null
}

type PersonalMealPlanReadResult = {
  data: PersonalMealPlanRow | null
  error: unknown | null
  schema: PersonalMealPlanSchema
}

export function isMissingPersonalMealPlanColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown }
  if (candidate.code === '42703' || candidate.code === 'PGRST204') return true
  return typeof candidate.message === 'string'
    && /column .*meal_plans.* does not exist|could not find .* column/i.test(candidate.message)
}

async function readForSchema(
  supabase: SupabaseClient,
  userId: string,
  schema: PersonalMealPlanSchema,
) {
  const legacy = schema === 'legacy'
  return supabase
    .from('meal_plans')
    .select(legacy
      ? 'id,user_id,plan:plan_data,active:is_active,created_at'
      : 'id,user_id,plan,active,created_at')
    .eq('user_id', userId)
    .eq(legacy ? 'is_active' : 'active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

/**
 * Production still exposes plan_data/is_active, while newer local schemas use
 * plan/active. Storage compatibility stays here; consumers receive one shape.
 */
export async function readActivePersonalMealPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalMealPlanReadResult> {
  const legacy = await readForSchema(supabase, userId, 'legacy')
  if (!legacy.error || !isMissingPersonalMealPlanColumn(legacy.error)) {
    return { data: legacy.data as PersonalMealPlanRow | null, error: legacy.error, schema: 'legacy' }
  }

  const canonical = await readForSchema(supabase, userId, 'canonical')
  return {
    data: canonical.data as PersonalMealPlanRow | null,
    error: canonical.error,
    schema: 'canonical',
  }
}
