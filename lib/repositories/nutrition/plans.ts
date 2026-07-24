import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { createCoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'

export const PERSONAL_MEAL_PLAN_PROJECTION = 'id,user_id,created_by,plan:plan_data,active:is_active,created_at' as const
export const ASSIGNED_MEAL_PLAN_PROJECTION = 'id,client_id,coach_id,plan,created_at,updated_at' as const

export type PersonalMealPlanRow = Pick<Tables<'meal_plans'>,
  'id' | 'user_id' | 'created_by' | 'name' | 'plan' | 'active' | 'created_at'>
export type AssignedMealPlanRow = Pick<Tables<'client_meal_plans'>,
  'id' | 'client_id' | 'coach_id' | 'plan' | 'created_at' | 'updated_at'>

// The deployed runtime schema still exposes the legacy activation column.
const DEPLOYED_PERSONAL_PLAN_ACTIVE_COLUMN = 'is_active' as never
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
      return error
        ? repositoryFailure(error)
        : { ok: true, data: (data ?? []) as unknown as PersonalMealPlanRow[] }
    },

    async findActivePersonalPlanForOwner(ownerUserId: string): Promise<RepositoryResult<PersonalMealPlanRow>> {
      const { data, error } = await client.from('meal_plans').select(PERSONAL_MEAL_PLAN_PROJECTION)
        .eq('user_id', ownerUserId).eq(DEPLOYED_PERSONAL_PLAN_ACTIVE_COLUMN, true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data
        ? { ok: true, data: data as unknown as PersonalMealPlanRow }
        : { ok: false, kind: 'not_found' }
    },

    async listAssignedPlansForClient(clientUserId: string, options: { limit?: number } = {}): Promise<RepositoryResult<AssignedMealPlanRow[]>> {
      const { data, error } = await client.from('client_meal_plans').select(ASSIGNED_MEAL_PLAN_PROJECTION)
        .eq('client_id', clientUserId).order('updated_at', { ascending: false }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findLatestAssignedPlanForCoachClient(
      coachUserId: string,
      clientUserId: string,
    ): Promise<RepositoryResult<AssignedMealPlanRow>> {
      const { data, error } = await client.from('client_meal_plans').select(ASSIGNED_MEAL_PLAN_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async findLatestAssignmentForActiveCoachClient(
      coachUserId: string,
      clientUserId: string,
    ): Promise<RepositoryResult<AssignedMealPlanRow>> {
      const relation = await createCoachClientRelationRepository(client).findActiveBetween(coachUserId, clientUserId)
      if (!relation.ok) return relation

      const { data, error } = await client.from('client_meal_plans').select(ASSIGNED_MEAL_PLAN_PROJECTION)
        .eq('coach_id', coachUserId).eq('client_id', clientUserId)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type NutritionPlanRepository = ReturnType<typeof createNutritionPlanRepository>
