import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'
import { personaForRun, type TestPersona } from '../../tests/fixtures/personas'
import {
  assertLocalFixtureEnvironment,
  createLocalPersona,
  upsertCoachClientRelation,
} from '../../tests/fixtures/supabase'

export const NUTRITION_E2E_PASSWORD = 'Local-Nutrition-Journal-42!'
export const NUTRITION_E2E_FOOD_NAME = 'Blanc de poulet cuit'

export type NutritionFixture = {
  coach: TestPersona
  client: TestPersona
  foreignClient: TestPersona
  ids: string[]
}

export function buildNutritionFixture(suffix: string): NutritionFixture {
  const coach = personaForRun('coach', `${suffix}-coach`)
  const client = personaForRun('client', `${suffix}-client`)
  const foreignClient = personaForRun('secondClient', `${suffix}-foreign`)
  return { coach, client, foreignClient, ids: [coach.id, client.id, foreignClient.id] }
}

export async function seedNutritionFixture(
  admin: SupabaseClient<Database>,
  fixture: NutritionFixture,
): Promise<void> {
  await cleanupNutritionFixture(admin, fixture.ids).catch(() => undefined)
  for (const persona of [fixture.coach, fixture.client, fixture.foreignClient]) {
    await createLocalPersona(admin, persona, NUTRITION_E2E_PASSWORD, {
      full_name: persona.id === fixture.client.id ? 'Client Nutrition E2E' : undefined,
      calorie_goal: persona.role === 'client' ? 2200 : undefined,
      protein_goal: persona.role === 'client' ? 160 : undefined,
      carbs_goal: persona.role === 'client' ? 240 : undefined,
      fat_goal: persona.role === 'client' ? 70 : undefined,
      needs_initial_generation: false,
    })
  }
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.client.id, 'active')
}

export async function assertFoodItemsEmpty(admin: SupabaseClient<Database>): Promise<void> {
  const { count, error } = await admin.from('food_items').select('id', { count: 'exact', head: true })
  if (error) throw new Error('Unable to verify the local food_items catalog')
  if (count !== 0) throw new Error(`Nutrition E2E requires an empty food_items catalog, received ${count ?? 'unknown'}`)
}

export async function readNutritionLogs(
  admin: SupabaseClient<Database>,
  userId: string,
  date: string,
) {
  const { data, error } = await admin.from('daily_food_logs')
    .select('id,user_id,date,meal_type,food_id,custom_name,quantity_g,calories,protein,carbs,fat,created_at')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('custom_name', NUTRITION_E2E_FOOD_NAME)
    .order('created_at', { ascending: true })
  if (error) throw new Error('Unable to read synthetic Nutrition journal rows')
  return data ?? []
}

export async function createAuthenticatedNutritionClient({
  url,
  anonKey,
  persona,
}: {
  url: string
  anonKey: string
  persona: TestPersona
}): Promise<SupabaseClient<Database>> {
  assertLocalFixtureEnvironment(url, 'e2e')
  if (!anonKey) throw new Error('Local anon key is required')
  const client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({
    email: persona.email,
    password: NUTRITION_E2E_PASSWORD,
  })
  if (error || data.user?.id !== persona.id) throw new Error('Unable to authenticate synthetic Nutrition persona')
  return client
}

export async function cleanupNutritionFixture(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const unique = [...new Set(ids)]
  if (!unique.length) return
  const failures: string[] = []
  for (const table of ['daily_food_logs', 'user_badges', 'user_xp', 'weekly_diagnostics'] as const) {
    const { error } = await admin.from(table).delete().in('user_id', unique)
    if (error) failures.push(`${table}.user_id`)
  }
  const relation = await admin.from('coach_clients').delete()
    .or(`coach_id.in.(${unique.join(',')}),client_id.in.(${unique.join(',')})`)
  if (relation.error) failures.push('coach_clients')
  const profiles = await admin.from('profiles').delete().in('id', unique)
  if (profiles.error) failures.push('profiles')
  for (const id of [...unique].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.toLowerCase().includes('not found')) failures.push('auth.users')
  }
  if (failures.length) throw new Error(`Synthetic Nutrition cleanup failed at ${[...new Set(failures)].join(', ')}`)
}

export async function assertNoSyntheticNutritionRows(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const checks = await Promise.all([
    admin.from('daily_food_logs').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids),
    admin.from('coach_clients').select('id', { count: 'exact', head: true })
      .or(`coach_id.in.(${ids.join(',')}),client_id.in.(${ids.join(',')})`),
  ])
  const residual = checks.map(result => result.count ?? 0)
  if (checks.some(result => result.error) || residual.some(count => count !== 0)) {
    throw new Error(`Synthetic Nutrition rows remain: ${residual.join(',')}`)
  }
  for (const id of ids) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (!error || data.user) throw new Error('Synthetic Nutrition Auth user remains after cleanup')
  }
  await assertFoodItemsEmpty(admin)
}
