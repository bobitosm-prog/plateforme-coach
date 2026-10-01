import type { SupabaseClient } from '@supabase/supabase-js'

export interface HistoricalSet {
  id: string; session_id: string; set_number: number; weight: number | null; reps: number | null
  created_at: string; load_mode: string | null; technique: string | null
  parent_set_number: number | null; duration_seconds: number | null
}
/** Read-only history: preserve recorded conventions and advanced-technique stages.
 * This evidence is never fed into automatic load suggestions.
 */
export async function loadLastExerciseSession(db: SupabaseClient, userId: string, exerciseId: string | null, name: string, signal: AbortSignal): Promise<HistoricalSet[]> {
  if (!userId || !name) throw new Error('HISTORY_OWNER_REQUIRED')
  if (exerciseId && !/^[0-9a-f-]{36}$/i.test(exerciseId)) throw new Error('INVALID_EXERCISE_ID')
  const query = () => {
    let q = db.from('workout_sets').select('id,session_id,set_number,weight,reps,created_at,load_mode,technique,parent_set_number,duration_seconds,workout_sessions!inner(completed)')
      .eq('user_id', userId).eq('completed', true).eq('workout_sessions.completed', true)
    q = exerciseId ? q.or(`exercise_id.eq.${exerciseId},and(exercise_id.is.null,exercise_name.eq.${JSON.stringify(name)})`) : q.eq('exercise_name', name)
    return q.abortSignal(signal)
  }
  const latest = await query().order('created_at', { ascending: false }).order('session_id', { ascending: false }).limit(1)
  if (latest.error) throw new Error('HISTORY_READ_FAILED')
  const session = latest.data?.[0]?.session_id
  if (!session) return []
  const rows: HistoricalSet[] = []
  for (let offset = 0; ; offset += 100) {
    const result = await query().eq('session_id', session).order('set_number').order('id').range(offset, offset + 99)
    if (result.error || !result.data) throw new Error('HISTORY_READ_FAILED')
    rows.push(...result.data)
    if (result.data.length < 100) return rows
  }
}
