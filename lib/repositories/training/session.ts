import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'

export const WORKOUT_SESSION_PROJECTION = 'id,user_id,name,completed,duration_minutes,notes,muscles_worked,created_at' as const
export const DASHBOARD_WORKOUT_SESSION_PROJECTION = 'id,user_id,name,completed,duration_minutes,notes,muscles_worked,created_at,workout_sets(id,session_id,user_id,exercise_id,exercise_name,set_number,reps,weight,rir,completed,created_at)' as const
export const COMPLETION_PROJECTION = 'id,client_id,coach_id,program_id,session_index,session_name,completed_at,duration_minutes,notes,created_at' as const
export const PERSONAL_RECORD_PROJECTION = 'id,user_id,exercise_name,record_type,value,previous_value,unit,achieved_at,created_at' as const
export const COMPLETED_WORKOUT_DATE_PROJECTION = 'created_at' as const

export type WorkoutSessionRow = Pick<Tables<'workout_sessions'>,
  'id' | 'user_id' | 'name' | 'completed' | 'duration_minutes' | 'notes' | 'muscles_worked' | 'created_at'>
export type WorkoutSetRow = Pick<Tables<'workout_sets'>,
  'id' | 'session_id' | 'user_id' | 'exercise_id' | 'exercise_name' | 'set_number' | 'reps' | 'weight' |
  'rir' | 'completed' | 'created_at'>
export type DashboardWorkoutSessionRow = WorkoutSessionRow & { workout_sets: WorkoutSetRow[] }
export type CompletedWorkoutDateRow = Pick<Tables<'workout_sessions'>, 'created_at'>
export type CompletionRow = Pick<Tables<'completed_sessions'>,
  'id' | 'client_id' | 'coach_id' | 'program_id' | 'session_index' | 'session_name' | 'completed_at' |
  'duration_minutes' | 'notes' | 'created_at'>
export type PersonalRecordRow = Pick<Tables<'personal_records'>,
  'id' | 'user_id' | 'exercise_name' | 'record_type' | 'value' | 'previous_value' | 'unit' | 'achieved_at' | 'created_at'>

export function createTrainingSessionRepository(client: DatabaseClient) {
  return {
    async listWorkoutSessionsForClient(clientUserId: string): Promise<RepositoryResult<WorkoutSessionRow[]>> {
      const { data, error } = await client.from('workout_sessions').select(WORKOUT_SESSION_PROJECTION)
        .eq('user_id', clientUserId).order('created_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findSessionById(sessionId: string, clientUserId: string): Promise<RepositoryResult<WorkoutSessionRow>> {
      const { data, error } = await client.from('workout_sessions').select(WORKOUT_SESSION_PROJECTION)
        .eq('id', sessionId).eq('user_id', clientUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listDashboardWorkoutSessions(clientUserId: string): Promise<RepositoryResult<DashboardWorkoutSessionRow[]>> {
      const { data, error } = await client.from('workout_sessions').select(DASHBOARD_WORKOUT_SESSION_PROJECTION)
        .eq('user_id', clientUserId).order('created_at', { ascending: false }).limit(90)
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listCompletionsForClient(clientUserId: string): Promise<RepositoryResult<CompletionRow[]>> {
      const { data, error } = await client.from('completed_sessions').select(COMPLETION_PROJECTION)
        .eq('client_id', clientUserId).order('completed_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listCompletionsForProgram(clientUserId: string, programId: string): Promise<RepositoryResult<CompletionRow[]>> {
      const { data, error } = await client.from('completed_sessions').select(COMPLETION_PROJECTION)
        .eq('client_id', clientUserId).eq('program_id', programId).order('session_index')
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listPersonalRecordsForClient(clientUserId: string): Promise<RepositoryResult<PersonalRecordRow[]>> {
      const { data, error } = await client.from('personal_records').select(PERSONAL_RECORD_PROJECTION)
        .eq('user_id', clientUserId).order('achieved_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async hasCompletedWorkout(clientUserId: string): Promise<RepositoryResult<boolean>> {
      const { count, error } = await client.from('workout_sessions').select('id', { count: 'exact', head: true })
        .eq('user_id', clientUserId).eq('completed', true)
      return error ? repositoryFailure(error) : { ok: true, data: (count ?? 0) > 0 }
    },

    async listCompletedWorkoutDates(clientUserId: string): Promise<RepositoryResult<CompletedWorkoutDateRow[]>> {
      const { data, error } = await client.from('workout_sessions').select(COMPLETED_WORKOUT_DATE_PROJECTION)
        .eq('user_id', clientUserId).eq('completed', true).order('created_at', { ascending: false }).limit(400)
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },
  }
}

export type TrainingSessionRepository = ReturnType<typeof createTrainingSessionRepository>
