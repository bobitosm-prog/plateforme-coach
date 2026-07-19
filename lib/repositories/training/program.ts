import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import { boundedPageSize, decodeTimestampCursor, encodeTimestampCursor, type PageRequest, type PaginatedResult } from '@/lib/repositories/pagination'

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
    async listCoachProgramPage(
      coachUserId: string,
      options: PageRequest = {},
    ): Promise<RepositoryResult<PaginatedResult<CoachProgramRow>>> {
      const pageSize = boundedPageSize(options.limit)
      const cursor = options.cursor ? decodeTimestampCursor(options.cursor) : null
      if (options.cursor && !cursor) {
        return { ok: false, kind: 'failure', error: { kind: 'unexpected', contextCode: 'INVALID_CURSOR' } }
      }
      let query = client.from('training_programs').select(COACH_PROGRAM_PROJECTION)
        .eq('coach_id', coachUserId).eq('is_template', true)
        .order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true })
      if (cursor) {
        query = cursor.timestamp === null
          ? query.is('created_at', null).gt('id', cursor.id)
          : query.or(`created_at.lt.${cursor.timestamp},and(created_at.eq.${cursor.timestamp},id.gt.${cursor.id}),created_at.is.null`)
      }
      const { data, error } = await query.limit(pageSize + 1)
      if (error) return repositoryFailure(error)
      const rows = data ?? []
      const hasMore = rows.length > pageSize
      const items = rows.slice(0, pageSize)
      const last = items.at(-1)
      const nextCursor = hasMore && last
        ? encodeTimestampCursor({ timestamp: last.created_at, id: last.id })
        : null
      return { ok: true, data: { items, hasMore, nextCursor } }
    },

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

    async findActivePersonalProgramForClient(clientUserId: string): Promise<RepositoryResult<PersonalProgramRow>> {
      const { data, error } = await client.from('custom_programs').select(PERSONAL_PROGRAM_PROJECTION)
        .eq('user_id', clientUserId).eq('is_active', true).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type TrainingProgramRepository = ReturnType<typeof createTrainingProgramRepository>
