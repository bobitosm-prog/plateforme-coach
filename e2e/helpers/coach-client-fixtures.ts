import { expect, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'
import { personaForRun, type TestPersona, type TestPersonaName } from '../../tests/fixtures/personas'
import { createLocalPersona, upsertCoachClientRelation } from '../../tests/fixtures/supabase'

export const COACH_CLIENT_PASSWORD = 'Local-Coach-Client-42!'

export type CoachClientFixture = {
  coach: TestPersona
  client: TestPersona
  secondCoach: TestPersona
  secondClient: TestPersona
  invited: TestPersona
  inactiveClient: TestPersona
  ids: string[]
}

const today = '2026-07-14'

export function buildCoachClientFixture(suffix: string): CoachClientFixture {
  const make = (name: TestPersonaName, tag: string) => personaForRun(name, `${suffix}-${tag}`)
  const coach = make('coach', 'coach')
  const client = make('client', 'client')
  const secondCoach = make('secondCoach', 'coach-foreign')
  const secondClient = make('secondClient', 'client-foreign')
  const invited = make('invited', 'invited')
  const inactiveClient = make('secondClient', 'client-inactive')
  return { coach, client, secondCoach, secondClient, invited, inactiveClient, ids: [coach.id, client.id, secondCoach.id, secondClient.id, invited.id, inactiveClient.id] }
}

export async function seedCoachClientFixture(admin: SupabaseClient<Database>, fixture: CoachClientFixture): Promise<void> {
  await cleanupCoachClientFixture(admin, fixture.ids).catch(() => undefined)
  for (const persona of [fixture.coach, fixture.client, fixture.secondCoach, fixture.secondClient, fixture.invited, fixture.inactiveClient]) {
    await createLocalPersona(admin, persona, COACH_CLIENT_PASSWORD, {
      full_name: persona.id === fixture.client.id ? 'Client Parcours' : persona.id === fixture.coach.id ? 'Coach Parcours' : undefined,
      current_weight: persona.role === 'client' ? 78 : undefined,
      target_weight: persona.role === 'client' ? 74 : undefined,
      calorie_goal: persona.role === 'client' ? 2200 : undefined,
      protein_goal: persona.role === 'client' ? 160 : undefined,
      carbs_goal: persona.role === 'client' ? 240 : undefined,
      fat_goal: persona.role === 'client' ? 70 : undefined,
    })
  }
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.client.id, 'active')
  await upsertCoachClientRelation(admin, fixture.secondCoach.id, fixture.secondClient.id, 'active')
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.inactiveClient.id, 'inactive')
  const { error } = await admin.from('client_programs').insert({
    coach_id: fixture.coach.id,
    client_id: fixture.client.id,
    program: { lundi: { nom: 'Force locale', repos: false, exercises: [{ name: 'Squat fixture', sets: 3, reps: 8, rest: 90 }] } },
  })
  if (error) throw new Error('Unable to seed synthetic program')
  for (const operation of [
    admin.from('weight_logs').insert({ user_id: fixture.client.id, poids: 78, date: today }),
    admin.from('completed_sessions').insert({ client_id: fixture.client.id, coach_id: fixture.coach.id, session_index: 0, session_name: 'Séance fixture', completed_at: `${today}T10:00:00.000Z`, duration_minutes: 42 }),
    admin.from('daily_food_logs').insert({ user_id: fixture.client.id, meal_type: 'dejeuner', custom_name: 'Repas fixture', quantity_g: 100, calories: 500, protein: 35, carbs: 55, fat: 15, date: today }),
    admin.from('scheduled_sessions').insert({ user_id: fixture.client.id, client_id: fixture.client.id, coach_id: fixture.coach.id, title: 'Planning fixture', scheduled_date: today, scheduled_at: `${today}T12:00:00.000Z`, status: 'scheduled' }),
    admin.from('messages').insert({ sender_id: fixture.coach.id, receiver_id: fixture.client.id, content: 'Message local de caractérisation' }),
  ]) {
    const { error: seedError } = await operation
    if (seedError) throw new Error('Unable to seed synthetic coach/client data')
  }
}

export async function cleanupCoachClientFixture(admin: SupabaseClient<Database>, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)]
  if (!unique.length) return
  const errors: string[] = []
  const deleteBy = async (table: 'messages' | 'scheduled_sessions' | 'daily_food_logs' | 'completed_sessions' | 'weight_logs' | 'client_programs', column: string) => {
    const { error } = await admin.from(table).delete().in(column, unique)
    if (error) errors.push(`${table}.${column}`)
  }
  await deleteBy('messages', 'sender_id'); await deleteBy('messages', 'receiver_id')
  await deleteBy('scheduled_sessions', 'user_id'); await deleteBy('daily_food_logs', 'user_id')
  await deleteBy('completed_sessions', 'client_id'); await deleteBy('weight_logs', 'user_id')
  await deleteBy('client_programs', 'client_id')
  for (const table of ['user_badges', 'user_xp', 'weekly_diagnostics'] as const) {
    const { error } = await admin.from(table).delete().in('user_id', unique)
    if (error) errors.push(`${table}.user_id`)
  }
  const relation = await admin.from('coach_clients').delete().or(`coach_id.in.(${unique.join(',')}),client_id.in.(${unique.join(',')})`)
  if (relation.error) errors.push('coach_clients')
  const profiles = await admin.from('profiles').delete().in('id', unique)
  if (profiles.error) errors.push('profiles')
  for (const id of [...unique].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.toLowerCase().includes('not found')) errors.push('auth.users')
  }
  if (errors.length) throw new Error(`Synthetic coach/client cleanup failed at ${[...new Set(errors)].join(', ')}`)
}

export async function loginLocalPersona(page: Page, persona: TestPersona, next = '/'): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.locator('input[type="email"]').fill(persona.email)
  await page.locator('input[type="password"]').fill(COACH_CLIENT_PASSWORD)
  await page.locator('button.gold-btn').click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 25_000 }).not.toBe('/login')
}

export async function assertNoSyntheticCoachClientRows(admin: SupabaseClient<Database>, ids: string[]): Promise<void> {
  const checks = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids),
    admin.from('coach_clients').select('id', { count: 'exact', head: true }).or(`coach_id.in.(${ids.join(',')}),client_id.in.(${ids.join(',')})`),
    admin.from('messages').select('id', { count: 'exact', head: true }).or(`sender_id.in.(${ids.join(',')}),receiver_id.in.(${ids.join(',')})`),
    admin.from('scheduled_sessions').select('id', { count: 'exact', head: true }).in('user_id', ids),
  ])
  expect(checks.map(result => result.count ?? 0)).toEqual([0, 0, 0, 0])
}
