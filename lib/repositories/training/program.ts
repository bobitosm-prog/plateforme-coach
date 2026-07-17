import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'

export const COACH_PROGRAM_PROJECTION = 'id,coach_id,name,description,is_template,tags,program,created_at' as const
export const ASSIGNED_PROGRAM_PROJECTION = 'id,client_id,coach_id,training_program_id,program,created_at,updated_at' as const
export const PERSONAL_PROGRAM_PROJECTION = 'id,user_id,name,description,days,phases,source,is_active,scheduled,start_date,current_week,total_weeks,created_at,updated_at' as const

export type CoachProgramRow = Pick<Tables<'training_programs'>,
  'id' | 'coach_id' | 'name' | 'description' | 'is_template' | 'tags' | 'program' | 'created_at'>
export type AssignedProgramRow = Pick<Tables<'client_programs'>,
  'id' | 'client_id' | 'coach_id' | 'training_program_id' | 'program' | 'created_at' | 'updated_at'>
export type PersonalProgramRow = Pick<Tables<'custom_programs'>,
  'id' | 'user_id' | 'name' | 'description' | 'days' | 'phases' | 'source' | 'is_active' | 'scheduled' |
  'start_date' | 'current_week' | 'total_weeks' | 'created_at' | 'updated_at'>

export function createTrainingProgramRepository(client: DatabaseClient) {
  return {
    async listCoachPrograms(coachUserId: string): Promise<RepositoryResult<CoachProgramRow[]>> {
      const { data, error } = await client.from('training_programs').select(COACH_PROGRAM_PROJECTION)
        .eq('coach_id', coachUserId).order('created_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findProgramByIdForOwner(programId: string, coachUserId: string): Promise<RepositoryResult<CoachProgramRow>> {
      const { data, error } = await client.from('training_programs').select(COACH_PROGRAM_PROJECTION)
        .eq('id', programId).eq('coach_id', coachUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listAssignedProgramsForClient(clientUserId: string): Promise<RepositoryResult<AssignedProgramRow[]>> {
      const { data, error } = await client.from('client_programs').select(ASSIGNED_PROGRAM_PROJECTION)
        .eq('client_id', clientUserId).order('created_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listPersonalProgramsForClient(clientUserId: string): Promise<RepositoryResult<PersonalProgramRow[]>> {
      const { data, error } = await client.from('custom_programs').select(PERSONAL_PROGRAM_PROJECTION)
        .eq('user_id', clientUserId).order('updated_at', { ascending: false })
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },
  }
}

export type TrainingProgramRepository = ReturnType<typeof createTrainingProgramRepository>
