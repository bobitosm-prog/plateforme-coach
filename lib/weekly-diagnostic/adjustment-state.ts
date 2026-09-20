import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '../profile-service'
import type { ProgramBaseline } from './adjustments'
import { findActiveCoachForClient, toActiveCoachResolutionState } from '../coach-relations/repository'

export async function loadWeeklyAdjustmentState(db: SupabaseClient, userId: string) {
  const { data: context, error } = await db.rpc('weekly_adjustment_context_v1', { p_user_id: userId })
  if (error || !context) throw new Error('Weekly baseline unavailable')
  const [profile, program, plan] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).single(),
    context.programId ? db.from('custom_programs').select('id,days,phases').eq('user_id', userId).eq('id', context.programId).single() : { data: null, error: null },
    context.mealPlanId ? db.from('meal_plans').select('id,plan_data').eq('user_id', userId).eq('id', context.mealPlanId).single() : { data: null, error: null },
  ])
  if (profile.error || program.error || plan.error) throw new Error('Weekly baseline data unavailable')
  const relation = toActiveCoachResolutionState(await findActiveCoachForClient(db, userId))
  if (relation.status === 'error' || relation.status === 'multiple_active') throw new Error('Weekly coach authority unavailable')
  return { context, profile: profile.data as Profile, program: program.data as ProgramBaseline | null,
    mealPlan: plan.data as { id: string; plan_data: unknown } | null, coachManaged: relation.isAuthoritative }
}
