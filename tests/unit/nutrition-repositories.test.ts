import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import {
  ACTIVE_COACH_CLIENT_PROJECTION,
  ASSIGNED_MEAL_PLAN_PROJECTION,
  COMMUNITY_FOOD_PROJECTION,
  CUSTOM_FOOD_PROJECTION,
  DAILY_FOOD_LOG_PROJECTION,
  GLOBAL_FOOD_PROJECTION,
  LEGACY_MEAL_LOG_PROJECTION,
  MEAL_COMPLETION_PROJECTION,
  PERSONAL_MEAL_PLAN_PROJECTION,
  RECIPE_PROJECTION,
  SAVED_MEAL_PROJECTION,
  WATER_INTAKE_PROJECTION,
  createNutritionCatalogRepository,
  createNutritionJournalRepository,
  createNutritionPlanRepository,
  createNutritionRecipeRepository,
} from '../../lib/repositories/nutrition'

type QueryResult = { data: unknown; error: unknown }
type RecordedCall = { table: string; method: string; args: unknown[] }

function clientWithResults(...results: QueryResult[]) {
  const calls: RecordedCall[] = []
  let queryIndex = 0
  const from = vi.fn((table: string) => {
    const result = results[Math.min(queryIndex++, results.length - 1)] ?? { data: null, error: null }
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'ilike', 'gte', 'lte']) {
      chain[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return chain
      })
    }
    chain.maybeSingle = vi.fn(async () => {
      calls.push({ table, method: 'maybeSingle', args: [] })
      return result
    })
    chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
    return chain
  })
  return { client: { from } as unknown as DatabaseClient, calls, from }
}

function callsFor(mock: ReturnType<typeof clientWithResults>, method: string) {
  return mock.calls.filter(call => call.method === method).map(call => ({ table: call.table, args: call.args }))
}

describe('Nutrition repositories', () => {
  it('reads bounded global and community catalogs with exact projections and safe search', async () => {
    const mock = clientWithResults({ data: [], error: null }, { data: [], error: null })
    const repository = createNutritionCatalogRepository(mock.client)

    await repository.listGlobalFoods({ search: '100%_avoine', limit: 900 })
    await repository.listCommunityFoods({ search: 'riz', limit: 20 })

    expect(callsFor(mock, 'select')).toEqual([
      { table: 'food_items', args: [GLOBAL_FOOD_PROJECTION] },
      { table: 'community_foods', args: [COMMUNITY_FOOD_PROJECTION] },
    ])
    expect(callsFor(mock, 'ilike')).toEqual([
      { table: 'food_items', args: ['name', '%100\\%\\_avoine%'] },
      { table: 'community_foods', args: ['name', '%riz%'] },
    ])
    expect(callsFor(mock, 'limit')[0]).toEqual({ table: 'food_items', args: [500] })
  })

  it('scopes custom foods to their owner and distinguishes absence', async () => {
    const list = clientWithResults({ data: [], error: null })
    await createNutritionCatalogRepository(list.client).listCustomFoodsForOwner('owner-session-id')
    expect(callsFor(list, 'select')).toContainEqual({ table: 'custom_foods', args: [CUSTOM_FOOD_PROJECTION] })
    expect(callsFor(list, 'eq')).toContainEqual({ table: 'custom_foods', args: ['user_id', 'owner-session-id'] })

    const absent = clientWithResults({ data: null, error: null })
    const result = await createNutritionCatalogRepository(absent.client)
      .findCustomFoodByIdForOwner('food-id', 'owner-session-id')
    expect(result).toEqual({ ok: false, kind: 'not_found' })
    expect(callsFor(absent, 'eq').map(call => call.args)).toEqual([
      ['id', 'food-id'], ['user_id', 'owner-session-id'],
    ])
  })

  it('keeps personal plan legacy JSON raw and scopes it to the owner', async () => {
    const rawPlan = { lundi: { repas: { dejeuner: [{ aliment: 'Riz', quantite_g: 100 }] } } }
    const row = { id: 'plan-id', plan: rawPlan }
    const mock = clientWithResults({ data: row, error: null })
    const result = await createNutritionPlanRepository(mock.client).findActivePersonalPlanForOwner('owner-id')

    expect(result).toEqual({ ok: true, data: row })
    expect((result.ok && result.data.plan)).toBe(rawPlan)
    expect(callsFor(mock, 'select')).toContainEqual({ table: 'meal_plans', args: [PERSONAL_MEAL_PLAN_PROJECTION] })
    expect(callsFor(mock, 'eq').map(call => call.args)).toEqual([
      ['user_id', 'owner-id'], ['active', true],
    ])
  })

  it('lists assigned plans by client scope with a stable bound', async () => {
    const mock = clientWithResults({ data: [], error: null })
    await createNutritionPlanRepository(mock.client).listAssignedPlansForClient('client-session-id', { limit: 500 })
    expect(callsFor(mock, 'select')).toContainEqual({ table: 'client_meal_plans', args: [ASSIGNED_MEAL_PLAN_PROJECTION] })
    expect(callsFor(mock, 'eq')).toContainEqual({ table: 'client_meal_plans', args: ['client_id', 'client-session-id'] })
    expect(callsFor(mock, 'limit')).toContainEqual({ table: 'client_meal_plans', args: [100] })
  })

  it('checks the active coach/client relation before reading an assignment', async () => {
    const relation = { id: 'relation-id', coach_id: 'coach-id', client_id: 'client-id', status: 'active' }
    const assignment = { id: 'assignment-id', plan: { legacy: true } }
    const mock = clientWithResults({ data: relation, error: null }, { data: assignment, error: null })
    const result = await createNutritionPlanRepository(mock.client)
      .findLatestAssignmentForActiveCoachClient('coach-id', 'client-id')

    expect(result).toEqual({ ok: true, data: assignment })
    expect(callsFor(mock, 'select')).toEqual([
      { table: 'coach_clients', args: [ACTIVE_COACH_CLIENT_PROJECTION] },
      { table: 'client_meal_plans', args: [ASSIGNED_MEAL_PLAN_PROJECTION] },
    ])
    expect(mock.from.mock.calls.map(call => call[0])).toEqual(['coach_clients', 'client_meal_plans'])
  })

  it('stops before assignment lookup when no active relation exists', async () => {
    const mock = clientWithResults({ data: null, error: null })
    const result = await createNutritionPlanRepository(mock.client)
      .findLatestAssignmentForActiveCoachClient('coach-id', 'client-id')
    expect(result).toEqual({ ok: false, kind: 'not_found' })
    expect(mock.from).toHaveBeenCalledTimes(1)
  })

  it('orders and bounds the distinct journal sources without merging them', async () => {
    const mock = clientWithResults(
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    )
    const repository = createNutritionJournalRepository(mock.client)
    const range = { fromDate: '2026-07-01', toDate: '2026-07-07', limit: 999 }

    await repository.listDailyFoodLogsForOwner('owner-id', range)
    await repository.listLegacyMealLogsForOwner('owner-id', { limit: 10 })
    await repository.listMealCompletionsForOwner('owner-id', range)
    await repository.listWaterIntakeForOwner('owner-id', range)

    expect(callsFor(mock, 'select')).toEqual([
      { table: 'daily_food_logs', args: [DAILY_FOOD_LOG_PROJECTION] },
      { table: 'meal_logs', args: [LEGACY_MEAL_LOG_PROJECTION] },
      { table: 'meal_tracking', args: [MEAL_COMPLETION_PROJECTION] },
      { table: 'water_intake', args: [WATER_INTAKE_PROJECTION] },
    ])
    expect(callsFor(mock, 'gte')).toContainEqual({ table: 'daily_food_logs', args: ['date', '2026-07-01'] })
    expect(callsFor(mock, 'lte')).toContainEqual({ table: 'water_intake', args: ['date', '2026-07-07'] })
    expect(callsFor(mock, 'limit').filter(call => call.args[0] === 500)).toHaveLength(3)
  })

  it('reads owner recipes, public recipes and saved meals through separate scopes', async () => {
    const mock = clientWithResults({ data: [], error: null }, { data: [], error: null }, { data: [], error: null })
    const repository = createNutritionRecipeRepository(mock.client)
    await repository.listRecipesForOwner('owner-id')
    await repository.listPublicRecipes()
    await repository.listSavedMealsForOwner('owner-id')

    expect(callsFor(mock, 'select')).toEqual([
      { table: 'recipes', args: [RECIPE_PROJECTION] },
      { table: 'recipes', args: [RECIPE_PROJECTION] },
      { table: 'saved_meals', args: [SAVED_MEAL_PROJECTION] },
    ])
    expect(callsFor(mock, 'eq')).toContainEqual({ table: 'recipes', args: ['is_public', true] })
    expect(callsFor(mock, 'eq')).toContainEqual({ table: 'saved_meals', args: ['user_id', 'owner-id'] })
  })

  it('expurgates raw Supabase errors', async () => {
    const mock = clientWithResults({ data: null, error: { code: '42501', message: 'private SQL and personal data' } })
    const result = await createNutritionRecipeRepository(mock.client).findRecipeByIdForOwner('recipe-id', 'owner-id')
    expect(result).toEqual({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(JSON.stringify(result)).not.toContain('private SQL')
    expect(JSON.stringify(result)).not.toContain('personal data')
  })

  it('contains no wildcard projection, client construction, service role or framework import', () => {
    const files = ['catalog.ts', 'plans.ts', 'journal.ts', 'recipes.ts', 'index.ts']
    const source = files.map(file => readFileSync(new URL(`../../lib/repositories/nutrition/${file}`, import.meta.url), 'utf8')).join('\n')
    expect(source).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)|createClient|supabase\/admin|supabase\/browser|supabase\/server/)
    expect(source).not.toContain('service_role')
    expect(source).not.toMatch(/\.(?:insert|update|upsert|delete)\(/)
  })
})
