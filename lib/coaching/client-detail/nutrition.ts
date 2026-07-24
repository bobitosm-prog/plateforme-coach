import type { DatabaseClient, Json } from '@/lib/supabase/types'
import { createActivePersonalMealPlanReader } from '@/lib/nutrition/personal-meal-plan-reader'
import { createNutritionPlanRepository } from '@/lib/repositories/nutrition'
import { createClientDetailAssignedPlanReader } from './nutrition-plan-reader'
import type { ClientDetailLoadResult, ClientDetailMutationResult, ClientDetailScope, LegacyAssignedMealPlan } from './types'

export interface ClientDetailNutritionData {
  readonly assignedPlan: LegacyAssignedMealPlan | null
  readonly activePlan: { readonly id: string; readonly plan_data: Json; readonly is_active: boolean | null; readonly created_at: string | null } | null
  readonly weeklyTracking: Readonly<Record<string, ReadonlySet<string>>>
}

export async function saveClientDetailMealPlan(client: DatabaseClient, scope: ClientDetailScope, input: { readonly planId: string | null; readonly payload: Readonly<Record<string, unknown>>; readonly calorieGoal: number }): Promise<ClientDetailMutationResult<string | null>> {
  const persistence = input.planId
    ? client.from('client_meal_plans').update(input.payload as never).eq('id', input.planId).eq('coach_id', scope.coachUserId).eq('client_id', scope.clientUserId).then(result => result)
    : client.from('client_meal_plans').insert(input.payload as never).select('id').single()
  const [plan, profile] = await Promise.all([
    persistence,
    client.rpc('update_active_client_profile', { target_client_id: scope.clientUserId, changes: { calorie_goal: input.calorieGoal } }),
  ])
  if (plan.error && profile.error) return { status: 'failure', stage: 'plan_and_profile' }
  if (plan.error) return { status: 'failure', stage: 'plan' }
  if (profile.error) return { status: 'failure', stage: 'profile' }
  const row = plan.data as unknown as { id?: string } | null
  return { status: 'success', data: input.planId ?? row?.id ?? null }
}

export async function loadClientDetailNutrition(client: DatabaseClient, scope: ClientDetailScope, mondayDate: string): Promise<ClientDetailLoadResult<ClientDetailNutritionData>> {
  const repository = createNutritionPlanRepository(client)
  const assignedReader = createClientDetailAssignedPlanReader(repository)
  const personalReader = createActivePersonalMealPlanReader(repository)
  const [assigned, active, tracking] = await Promise.all([
    assignedReader.load(scope),
    personalReader.load(scope.clientUserId),
    client.from('meal_tracking').select('date,meal_type,is_completed').eq('user_id', scope.clientUserId).gte('date', mondayDate).eq('is_completed' as never, true).limit(200),
  ])
  if (
    (assigned.status !== 'ready' && assigned.status !== 'absent') ||
    (active.status !== 'ready' && active.status !== 'absent') ||
    tracking.error
  ) {
    return { status: 'unavailable', source: 'nutrition' }
  }
  const trackingData = tracking.data as unknown as readonly { date: string; meal_type: string | null; is_completed: boolean | null }[] | null
  const weeklyTracking: Record<string, Set<string>> = {}
  for (const row of trackingData ?? []) {
    if (!row.meal_type) continue
    if (!weeklyTracking[row.date]) weeklyTracking[row.date] = new Set()
    weeklyTracking[row.date].add(row.meal_type)
  }
  return {
    status: 'success',
    data: {
      assignedPlan: assigned.status === 'ready' ? assigned.plan : null,
      activePlan: active.status === 'ready'
        ? {
          id: active.plan.id,
          created_at: active.plan.created_at,
          plan_data: active.plan.plan_data as Json,
          is_active: active.plan.is_active,
        }
        : null,
      weeklyTracking,
    },
  }
}

export async function loadClientDetailWeeklyTracking(client: DatabaseClient, clientUserId: string, mondayDate: string): Promise<ClientDetailLoadResult<Readonly<Record<string, ReadonlySet<string>>>>> {
  const result = await client.from('meal_tracking').select('date,meal_type,is_completed').eq('user_id', clientUserId).gte('date', mondayDate).eq('is_completed' as never, true).limit(200)
  if (result.error) return { status: 'unavailable', source: 'nutrition' }
  const rows = result.data as unknown as readonly { date: string; meal_type: string | null }[] | null
  const tracking: Record<string, Set<string>> = {}
  for (const row of rows ?? []) {
    if (!row.meal_type) continue
    if (!tracking[row.date]) tracking[row.date] = new Set()
    tracking[row.date].add(row.meal_type)
  }
  return { status: 'success', data: tracking }
}
