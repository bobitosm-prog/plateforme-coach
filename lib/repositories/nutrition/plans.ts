import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'

export const PERSONAL_MEAL_PLAN_PROJECTION = 'id,user_id,created_by,name,plan,active,created_at' as const
export const ASSIGNED_MEAL_PLAN_PROJECTION = 'id,client_id,coach_id,plan,created_at,updated_at' as const
export const ACTIVE_COACH_CLIENT_PROJECTION = 'id,coach_id,client_id,status' as const

export type PersonalMealPlanRow = Pick<Tables<'meal_plans'>,
  'id' | 'user_id' | 'created_by' | 'name' | 'plan' | 'active' | 'created_at'>
export type AssignedMealPlanRow = Pick<Tables<'client_meal_plans'>,
  'id' | 'client_id' | 'coach_id' | 'plan' | 'created_at' | 'updated_at'>
export type ActiveCoachClientRow = Pick<Tables<'coach_clients'>, 'id' | 'coach_id' | 'client_id' | 'status'>

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

export function createNutritionPlanRepository(client: DatabaseClient) {
  return {
    async listPersonalPlansForOwner(ownerUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<PersonalMealPlanRow[]>> {
      const { data, error } = await client.from('meal_plans').select(PERSONAL_MEAL_PLAN_PROJECTION)
        .eq('user_id', ownerUserId).order('created_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findActivePersonalPlanForOwner(ownerUserId: string): Promise<RepositoryResult<PersonalMealPlanRow>> {
      const { data, error } = await client.from('meal_plans').select(PERSONAL_MEAL_PLAN_PROJECTION)
        .eq('user_id', ownerUserId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async listAssignedPlansForClient(clientUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<AssignedMealPlanRow[]>> {
      const { data, error } = await client.from('client_meal_plans').select(ASSIGNED_MEAL_PLAN_PROJECTION)
        .eq('client_id', clientUserId).order('updated_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findLatestAssignmentForActiveCoachClient(
      coachUserId: string,
      clientUserId: string,
    ): Promise<RepositoryResult<AssignedMealPlanRow>> {
      const { data: relation, error: relationError } = await client.from('coach_clients').select(ACTIVE_COACH_CLIENT_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId).eq('status', 'active').maybeSingle()
      if (relationError) return repositoryFailure(relationError)
      if (!relation) return { ok: false, kind: 'not_found' }

      const { data, error } = await client.from('client_meal_plans').select(ASSIGNED_MEAL_PLAN_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type NutritionPlanRepository = ReturnType<typeof createNutritionPlanRepository>
