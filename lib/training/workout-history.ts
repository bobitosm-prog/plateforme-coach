import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSessionType } from '../session-types'

export interface WorkoutHistoryItem {
  id: string
  name?: string | null
  completed?: boolean | null
  date?: string | null
  created_at: string
  duration_minutes?: number | null
  muscles_worked?: string[] | null
}

const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const muscleTerms: Record<string, string[]> = {
  pectoraux: ['pectoraux', 'poitrine', 'chest', 'pec'],
  dos: ['dos', 'back', 'dorsal', 'dorsaux'],
  epaules: ['epaule', 'epaules', 'shoulder', 'shoulders', 'deltoides'],
  jambes: ['jambes', 'quadriceps', 'quads', 'ischio', 'fessiers', 'mollets', 'legs', 'glutes', 'hamstrings', 'calves'],
}

/** Muscle filters are inclusive, unlike the single display category of a session. */
export function matchesWorkoutHistory(session: WorkoutHistoryItem, filter: string): boolean {
  if (filter === 'all') return true
  const type = resolveSessionType(session.name).key
  if (!muscleTerms[filter]) return type === filter
  const evidence = ` ${fold([session.name ?? '', ...(session.muscles_worked ?? [])].join(' '))} `
  return type === filter || muscleTerms[filter].some(term => evidence.includes(` ${term} `))
}

/** On-demand, owner-scoped metadata pages, independent of the dashboard's 90-row window. */
export async function loadWorkoutHistory(db: SupabaseClient, userId: string, signal?: AbortSignal): Promise<WorkoutHistoryItem[]> {
  if (!userId) throw new Error('HISTORY_AUTH_REQUIRED')
  const rows = new Map<string, WorkoutHistoryItem>()
  const snapshot = new Date().toISOString()
  for (let offset = 0; ; offset += 100) {
    if (signal?.aborted) throw new Error('HISTORY_ABORTED')
    let query = db.from('workout_sessions')
      .select('id,name,date,created_at,duration_minutes,completed,muscles_worked')
      .eq('user_id', userId).eq('completed', true).lte('created_at', snapshot)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + 99)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error || !data) throw new Error('HISTORY_READ_FAILED')
    for (const row of data) rows.set(row.id, row)
    if (data.length < 100) break
  }
  // Older sessions sometimes have neither a descriptive title nor recorded muscles.
  // Use exact historical catalogue names, never fuzzy replacement or current program data.
  const missing = [...rows.values()].filter(row => !row.muscles_worked?.length)
  for (let offset = 0; offset < missing.length; offset += 50) {
    if (signal?.aborted) throw new Error('HISTORY_ABORTED')
    let query = db.from('workout_sets').select('session_id,exercise_name')
      .eq('user_id', userId).eq('completed', true).in('session_id', missing.slice(offset, offset + 50).map(row => row.id))
    // Page sets as well: PostgREST row caps must not truncate historical evidence.
    const sets: {session_id: string; exercise_name: string}[] = []
    for (let page = 0; ; page += 500) {
      let request = query.order('id').range(page, page + 499)
      if (signal) request = request.abortSignal(signal)
      const result = await request
      if (result.error || !result.data) throw new Error('HISTORY_SETS_FAILED')
      sets.push(...result.data)
      if (result.data.length < 500) break
    }
    const names = [...new Set(sets.map(set => set.exercise_name))]
    const muscles = new Map<string, string>()
    for (let n = 0; n < names.length; n += 100) {
      let request = db.from('exercises_db').select('name,muscle_group').in('name', names.slice(n, n + 100))
      if (signal) request = request.abortSignal(signal)
      const result = await request
      if (result.error || !result.data) throw new Error('HISTORY_CATALOG_FAILED')
      for (const exercise of result.data) if (exercise.muscle_group) muscles.set(exercise.name, exercise.muscle_group)
    }
    for (const set of sets) {
      const muscle = muscles.get(set.exercise_name)
      const row = rows.get(set.session_id)
      if (row && muscle) row.muscles_worked = [...new Set([...(row.muscles_worked ?? []), muscle])]
    }
  }
  return [...rows.values()]
}
