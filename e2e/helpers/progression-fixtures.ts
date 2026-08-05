import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'
import { personaForRun, type TestPersona } from '../../tests/fixtures/personas'
import {
  assertLocalFixtureEnvironment,
  createLocalPersona,
  upsertCoachClientRelation,
} from '../../tests/fixtures/supabase'

export const PROGRESSION_E2E_PASSWORD = 'Local-Progression-42!'

export type ProgressionFixture = {
  coach: TestPersona
  client: TestPersona
  foreignClient: TestPersona
  ids: string[]
  dates: {
    oldest: string
    latest: string
    mutation: string
  }
  workoutSessionId: string
}

function addUtcDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().split('T')[0]
}

export function buildProgressionFixture(suffix: string, referenceDate: string): ProgressionFixture {
  const coach = personaForRun('coach', `${suffix}-coach`)
  const client = personaForRun('client', `${suffix}-client`)
  const foreignClient = personaForRun('secondClient', `${suffix}-foreign`)
  return {
    coach,
    client,
    foreignClient,
    ids: [coach.id, client.id, foreignClient.id],
    dates: {
      oldest: addUtcDays(referenceDate, -2),
      latest: addUtcDays(referenceDate, -1),
      mutation: referenceDate,
    },
    workoutSessionId: crypto.randomUUID(),
  }
}

export async function seedProgressionFixture(
  admin: SupabaseClient<Database>,
  fixture: ProgressionFixture,
): Promise<void> {
  await cleanupProgressionFixture(admin, fixture.ids).catch(() => undefined)
  for (const persona of [fixture.coach, fixture.client, fixture.foreignClient]) {
    await createLocalPersona(admin, persona, PROGRESSION_E2E_PASSWORD, {
      full_name: persona.id === fixture.client.id ? 'Client Progression E2E' : undefined,
      current_weight: persona.id === fixture.client.id ? 80 : undefined,
      start_weight: persona.id === fixture.client.id ? 81 : undefined,
      target_weight: persona.id === fixture.client.id ? 76 : undefined,
      calorie_goal: persona.id === fixture.client.id ? 2200 : undefined,
      water_goal: persona.id === fixture.client.id ? 2500 : undefined,
      needs_initial_generation: false,
    })
  }
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.client.id, 'active')

  const operations = [
    admin.from('weight_logs').insert([
      { user_id: fixture.client.id, date: fixture.dates.oldest, poids: 80.4 },
      { user_id: fixture.client.id, date: fixture.dates.latest, poids: 80 },
    ]),
    admin.from('body_measurements').insert({
      user_id: fixture.client.id,
      date: fixture.dates.oldest,
      waist: 82,
      hips: 96,
      chest: 101,
    }),
    admin.from('personal_records').insert({
      user_id: fixture.client.id,
      exercise_name: 'Squat',
      record_type: 'max_weight',
      value: 100,
      unit: 'kg',
      achieved_at: fixture.dates.latest,
    }),
    admin.from('workout_sessions').insert({
      id: fixture.workoutSessionId,
      user_id: fixture.client.id,
      name: 'Séance progression E2E',
      completed: true,
      duration_minutes: 42,
      muscles_worked: ['legs'],
      created_at: `${fixture.dates.latest}T10:00:00.000Z`,
    }),
    admin.from('workout_sets').insert({
      session_id: fixture.workoutSessionId,
      user_id: fixture.client.id,
      exercise_name: 'Squat',
      set_number: 1,
      reps: 5,
      weight: 100,
      completed: true,
      created_at: `${fixture.dates.latest}T10:05:00.000Z`,
    }),
  ]
  for (const operation of operations) {
    const { error } = await operation
    if (error) throw new Error('Unable to seed synthetic Progression data')
  }
}

export async function createAuthenticatedProgressionClient({
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
    password: PROGRESSION_E2E_PASSWORD,
  })
  if (error || data.user?.id !== persona.id) throw new Error('Unable to authenticate synthetic Progression persona')
  return client
}

export async function cleanupProgressionFixture(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const unique = [...new Set(ids)]
  if (!unique.length) return
  const failures: string[] = []
  for (const table of [
    'workout_sets',
    'workout_sessions',
    'completed_sessions',
    'personal_records',
    'body_measurements',
    'weight_logs',
    'daily_food_logs',
    'user_badges',
    'user_xp',
    'weekly_diagnostics',
  ] as const) {
    const column = table === 'completed_sessions' ? 'client_id' : 'user_id'
    const { error } = await admin.from(table).delete().in(column, unique)
    if (error) failures.push(`${table}.${column}`)
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
  if (failures.length) throw new Error(`Synthetic Progression cleanup failed at ${[...new Set(failures)].join(', ')}`)
}

export async function assertNoSyntheticProgressionRows(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const checks = await Promise.all([
    admin.from('weight_logs').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('body_measurements').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('personal_records').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('workout_sessions').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('workout_sets').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids),
    admin.from('coach_clients').select('id', { count: 'exact', head: true })
      .or(`coach_id.in.(${ids.join(',')}),client_id.in.(${ids.join(',')})`),
  ])
  const residual = checks.map(result => result.count ?? 0)
  if (checks.some(result => result.error) || residual.some(count => count !== 0)) {
    throw new Error(`Synthetic Progression rows remain: ${residual.join(',')}`)
  }
  for (const id of ids) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (!error || data.user) throw new Error('Synthetic Progression Auth user remains after cleanup')
  }
}
