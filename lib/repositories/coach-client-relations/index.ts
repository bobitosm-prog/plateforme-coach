import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables, Views } from '@/lib/supabase/types'

export const COACH_CLIENT_RELATION_PROJECTION =
  'id,coach_id,client_id,status,created_at,invited_by_coach' as const
export const RELATED_PROFILE_SUMMARY_PROJECTION =
  'id,full_name,email,avatar_url,current_weight,calorie_goal,subscription_type,created_at' as const

export type CoachClientRelation = Pick<Tables<'coach_clients'>,
  'id' | 'coach_id' | 'client_id' | 'status' | 'created_at' | 'invited_by_coach'>
export type RelatedProfileSummary = Pick<Views<'active_related_profiles'>,
  'id' | 'full_name' | 'email' | 'avatar_url' | 'current_weight' | 'calorie_goal' |
  'subscription_type' | 'created_at'>

export type RelationStatus =
  | { kind: 'active'; relation: CoachClientRelation }
  | { kind: 'inactive'; relation: CoachClientRelation }

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

function oneRelation(rows: CoachClientRelation[] | null): RepositoryResult<CoachClientRelation> {
  if (!rows?.length) return { ok: false, kind: 'not_found' }
  if (rows.length > 1) {
    return { ok: false, kind: 'failure', error: { kind: 'conflict', contextCode: 'MULTIPLE_ACTIVE' } }
  }
  return { ok: true, data: rows[0] }
}

export function createCoachClientRelationRepository(client: DatabaseClient) {
  return {
    async findRelationByPair(coachUserId: string, clientUserId: string): Promise<RepositoryResult<RelationStatus>> {
      const { data, error } = await client.from('coach_clients').select(COACH_CLIENT_RELATION_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId)
        .order('created_at', { ascending: false }).order('id', { ascending: true }).limit(1)
      if (error) return repositoryFailure(error)
      const relation = data?.[0]
      if (!relation) return { ok: false, kind: 'not_found' }
      return { ok: true, data: { kind: relation.status === 'active' ? 'active' : 'inactive', relation } }
    },

    async findActiveBetween(coachUserId: string, clientUserId: string): Promise<RepositoryResult<CoachClientRelation>> {
      const { data, error } = await client.from('coach_clients').select(COACH_CLIENT_RELATION_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId).eq('status', 'active')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(2)
      if (error) return repositoryFailure(error)
      return oneRelation(data)
    },

    async hasActiveRelation(coachUserId: string, clientUserId: string): Promise<RepositoryResult<boolean>> {
      const result = await this.findActiveBetween(coachUserId, clientUserId)
      if (result.ok) return { ok: true, data: true }
      if (result.kind === 'not_found') return { ok: true, data: false }
      return result
    },

    async findActiveCoachForClient(clientUserId: string): Promise<RepositoryResult<CoachClientRelation>> {
      const { data, error } = await client.from('coach_clients').select(COACH_CLIENT_RELATION_PROJECTION)
        .eq('client_id', clientUserId).eq('status', 'active')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(2)
      if (error) return repositoryFailure(error)
      return oneRelation(data)
    },

    async listActiveClientsForCoach(
      coachUserId: string,
      options: { limit?: number } = {},
    ): Promise<RepositoryResult<CoachClientRelation[]>> {
      const { data, error } = await client.from('coach_clients').select(COACH_CLIENT_RELATION_PROJECTION)
        .eq('coach_id', coachUserId).eq('status', 'active')
        .order('created_at', { ascending: false }).order('id', { ascending: true })
        .limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listActiveRelatedProfiles(
      relatedUserIds: string[],
      options: { limit?: number } = {},
    ): Promise<RepositoryResult<RelatedProfileSummary[]>> {
      if (relatedUserIds.length === 0) return { ok: true, data: [] }
      const { data, error } = await client.from('active_related_profiles').select(RELATED_PROFILE_SUMMARY_PROJECTION)
        .in('id', relatedUserIds.slice(0, MAX_LIMIT)).order('created_at', { ascending: false })
        .limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },
  }
}

export type CoachClientRelationRepository = ReturnType<typeof createCoachClientRelationRepository>
