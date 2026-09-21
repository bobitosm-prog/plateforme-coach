import type { SupabaseClient } from '@supabase/supabase-js'
import { diagnosticWeek } from './week'
import { loadWeeklyAdjustmentState } from './adjustment-state'
import { prepareWeeklyAdjustment } from './adjustments'

/** Auth/entitlement are checked by the caller; every lookup is owner-scoped. */
export async function applyWeeklyDiagnostic(db: SupabaseClient, userId: string, id: string, now = new Date()) {
  const { data: diagnostic, error } = await db.from('weekly_diagnostics').select('*').eq('id', id).eq('user_id', userId).single()
  if (error || !diagnostic) return { status: 404, code: 'not_found' }
  if (diagnostic.applied_at) return { status: 200, already_applied: true, applied_at: diagnostic.applied_at, changes: diagnostic.applied_changes?.summary }
  if (diagnostic.policy_version !== 2 || diagnostic.week_start !== diagnosticWeek(now).weekStart) return { status: 409, code: 'expired' }
  if(diagnostic.ajustements?.training_volume_delta_pct) {
    const followup=await db.from('training_followup_preferences').select('enabled').eq('user_id',userId).maybeSingle()
    if(followup.error) return {status:503,code:'unavailable'}
    if(followup.data?.enabled!==true) return {status:409,code:'followup_disabled'}
  }
  const state = await loadWeeklyAdjustmentState(db, userId)
  if (state.coachManaged) return { status: 403, code: 'coach_managed' }
  if (JSON.stringify(state.context) !== JSON.stringify(diagnostic.application_context)) return { status: 409, code: 'changed' }
  let candidate
  try { candidate = prepareWeeklyAdjustment(state.profile, state.program, state.mealPlan, diagnostic.ajustements ?? {}, diagnosticWeek(now).endExclusive) }
  catch { return { status: 422, code: 'unsupported' } }
  const result = await db.rpc('apply_weekly_adjustment_v1', { p_user_id: userId, p_diagnostic_id: id, p_candidate: candidate })
  if (result.error) return { status: result.error.code === 'PT409' ? 409 : 503, code: result.error.code === 'PT409' ? 'changed' : 'unavailable' }
  return { status: 200, ...result.data }
}
