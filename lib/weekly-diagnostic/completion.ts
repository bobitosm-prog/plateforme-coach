import { createHash } from 'node:crypto'
import { diagnosticWeek } from './week'
import { getSessionForDay } from '../get-today-session'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findActiveCoachForClient, toActiveCoachResolutionState } from '../coach-relations/repository'
import { normalizeCoachProgram } from '../normalizeCoachProgram'

type WeeklyDatabase = Pick<SupabaseClient, 'from'>
type Session = { id: string; completed: boolean; session_type?: string }

export type WeeklyCompletionStatus = ReturnType<typeof diagnosticWeek> & {
  eligible: boolean
  hasMeals: boolean
  trainingState: 'rest' | 'completed' | 'pending'
  confirmed: boolean
  canGenerate: boolean
  diagnosticId: string | null
}

/** Shared by HTTP and cron: missing data/errors must never unlock a generation. */
export async function readWeeklyCompletion(db: WeeklyDatabase, userId: string, now = new Date()) {
  const week = diagnosticWeek(now)
  const results = await Promise.all([
    db.from('weekly_day_completions').select('*').eq('user_id', userId).eq('sunday', week.sunday).maybeSingle(),
    db.from('daily_food_logs').select('id, meal_type, calories, protein, carbs, fat, quantity_g').eq('user_id', userId).eq('date', week.sunday).order('id'),
    db.from('workout_sessions').select('id, completed').eq('user_id', userId).eq('date', week.sunday).order('id'),
    db.from('scheduled_sessions').select('id, session_type, completed').eq('user_id', userId).eq('scheduled_date', week.sunday).order('id'),
    db.from('profiles').select('created_at').eq('id', userId).single(),
    db.from('custom_programs').select('days').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle(),
    db.from('weekly_diagnostics').select('id').eq('user_id', userId).eq('week_start', week.weekStart).maybeSingle(),
  ])
  if (results.some(r => r.error)) throw new Error('Weekly completion data unavailable')
  const [completion, food, workouts, schedule, profile, program, diagnostic] = results.map(r => r.data)
  const planned: Session[] = (schedule ?? []).filter((s: Session) => s.session_type !== 'rest')
  // The dated calendar is authoritative; fall back to the personal weekly plan.
  let expected = schedule?.length ? planned.length
    : getSessionForDay(program?.days ?? [], 6).type === 'workout' ? 1 : 0
  if (!schedule?.length) {
    // Same authoritative coach relation as the training dashboard; never use a
    // legacy/default coach link or mislabel a coached Sunday as a rest day.
    const relation = toActiveCoachResolutionState(await findActiveCoachForClient(db as SupabaseClient, userId))
    if (relation.status === 'error' || relation.status === 'multiple_active') throw new Error('Weekly coach schedule unavailable')
    if (relation.isAuthoritative && relation.coachId) {
      const coached = await db.from('client_programs').select('program')
        .eq('client_id', userId).eq('coach_id', relation.coachId).order('created_at', { ascending: false }).limit(20)
      if (coached.error) throw new Error('Weekly coach program unavailable')
      const active = coached.data?.map(row => normalizeCoachProgram(row.program)).find(Boolean)
      if (active) {
        const day = active.dimanche
        expected = day && !day.repos && !day.is_rest && day.exercises?.length ? 1 : 0
      }
    }
  }
  const finished = (workouts ?? []).filter((s: Session) => s.completed).length
  // Calendar completion and workout logs can refer to the same session: do not add them.
  const completedCount = Math.max(finished, planned.filter(s => s.completed).length)
  const trainingState: WeeklyCompletionStatus['trainingState'] =
    completedCount < expected || (workouts ?? []).some((s: Session) => !s.completed)
      ? 'pending' : completedCount > 0 ? 'completed' : 'rest'
  const snapshot = createHash('sha256').update(JSON.stringify({ food, workouts, schedule, expected })).digest('hex')
  const eligible = Boolean(profile?.created_at) && diagnosticWeek(new Date(profile.created_at)).today <= week.sunday
  const hasMeals = Boolean(food?.length)
  const confirmed = eligible && hasMeals && completion?.snapshot === snapshot
    && completion?.meals_confirmed === true
    && (trainingState !== 'pending' || completion.training_status === 'skipped')
  const status: WeeklyCompletionStatus = {
    ...week, eligible, hasMeals, trainingState, confirmed,
    canGenerate: confirmed && !diagnostic, diagnosticId: diagnostic?.id ?? null,
  }
  return { status, snapshot }
}

export async function confirmWeeklyCompletion(db: WeeklyDatabase, userId: string, input: {
  weekStart?: string; mealsConfirmed?: boolean; skipTraining?: boolean
}, now = new Date()) {
  const { status, snapshot } = await readWeeklyCompletion(db, userId, now)
  if (input.weekStart !== status.weekStart || !status.eligible || !status.hasMeals
    || input.mealsConfirmed !== true || (status.trainingState === 'pending' && input.skipTraining !== true)) {
    return { error: 'Confirme les repas du dimanche et termine ou déclare sautée la séance prévue.', status: 409 }
  }
  if (status.diagnosticId) return { error: 'Le bilan de cette semaine existe déjà.', status: 409 }
  const { error } = await db.from('weekly_day_completions').upsert({
    user_id: userId, sunday: status.sunday, meals_confirmed: true,
    training_status: status.trainingState === 'pending' ? 'skipped' : status.trainingState,
    snapshot, confirmed_at: now.toISOString(),
  }, { onConflict: 'user_id,sunday' })
  if (error) throw new Error('Weekly completion save failed')
  return { completion: (await readWeeklyCompletion(db, userId, now)).status }
}
