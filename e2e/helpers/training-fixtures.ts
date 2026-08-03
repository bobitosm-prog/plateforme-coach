import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'
import { personaForRun, type TestPersona } from '../../tests/fixtures/personas'
import { createLocalPersona, upsertCoachClientRelation } from '../../tests/fixtures/supabase'

export const TRAINING_E2E_PASSWORD = 'Local-Training-Cycle-42!'
export const TRAINING_E2E_SESSION_NAME = 'Training E2E Cycle'
export const TRAINING_E2E_EXERCISE_NAME = 'Squat Training E2E'

export type TrainingFixture = {
  coach: TestPersona
  client: TestPersona
  foreignClient: TestPersona
  ids: string[]
}

const programDay = () => ({
  name: TRAINING_E2E_SESSION_NAME,
  repos: false,
  exercises: [{
    name: TRAINING_E2E_EXERCISE_NAME,
    muscle_group: 'Jambes',
    sets: 2,
    reps: '7-8',
    rest: 90,
  }],
})

export function buildTrainingFixture(suffix: string): TrainingFixture {
  const coach = personaForRun('coach', `${suffix}-coach`)
  const client = personaForRun('client', `${suffix}-client`)
  const foreignClient = personaForRun('secondClient', `${suffix}-foreign`)
  return { coach, client, foreignClient, ids: [coach.id, client.id, foreignClient.id] }
}

export async function seedTrainingFixture(admin: SupabaseClient<Database>, fixture: TrainingFixture): Promise<void> {
  await cleanupTrainingFixture(admin, fixture.ids).catch(() => undefined)
  for (const persona of [fixture.coach, fixture.client, fixture.foreignClient]) {
    await createLocalPersona(admin, persona, TRAINING_E2E_PASSWORD, {
      full_name: persona.id === fixture.client.id ? 'Client Training E2E' : undefined,
    })
  }
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.client.id, 'active')
  const { error } = await admin.from('client_programs').insert({
    coach_id: fixture.coach.id,
    client_id: fixture.client.id,
    program: {
      lundi: programDay(), mardi: programDay(), mercredi: programDay(), jeudi: programDay(),
      vendredi: programDay(), samedi: programDay(), dimanche: programDay(),
    },
  })
  if (error) throw new Error('Unable to seed synthetic Training program')
}

export async function cleanupTrainingFixture(admin: SupabaseClient<Database>, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)]
  if (!unique.length) return
  const errors: string[] = []
  const deleteBy = async (
    table: 'workout_sets' | 'workout_sessions' | 'completed_sessions' | 'scheduled_sessions' | 'personal_records' |
      'user_xp' | 'user_badges' | 'client_programs' | 'custom_programs',
    column: string,
  ) => {
    const { error } = await admin.from(table).delete().in(column, unique)
    if (error) errors.push(`${table}.${column}`)
  }
  await deleteBy('workout_sets', 'user_id')
  await deleteBy('workout_sessions', 'user_id')
  await deleteBy('completed_sessions', 'client_id')
  await deleteBy('scheduled_sessions', 'user_id')
  await deleteBy('personal_records', 'user_id')
  await deleteBy('user_badges', 'user_id')
  await deleteBy('user_xp', 'user_id')
  await deleteBy('client_programs', 'client_id')
  await deleteBy('custom_programs', 'user_id')
  const relation = await admin.from('coach_clients').delete().or(`coach_id.in.(${unique.join(',')}),client_id.in.(${unique.join(',')})`)
  if (relation.error) errors.push('coach_clients')
  const profiles = await admin.from('profiles').delete().in('id', unique)
  if (profiles.error) errors.push('profiles')
  for (const id of [...unique].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.toLowerCase().includes('not found')) errors.push('auth.users')
  }
  if (errors.length) throw new Error(`Synthetic Training cleanup failed at ${[...new Set(errors)].join(', ')}`)
}

export async function assertNoSyntheticTrainingRows(admin: SupabaseClient<Database>, ids: string[]): Promise<void> {
  const checks = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids),
    admin.from('coach_clients').select('id', { count: 'exact', head: true }).or(`coach_id.in.(${ids.join(',')}),client_id.in.(${ids.join(',')})`),
    admin.from('workout_sessions').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('workout_sets').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('completed_sessions').select('id', { count: 'exact', head: true }).in('client_id', ids),
    admin.from('scheduled_sessions').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('personal_records').select('id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('user_xp').select('user_id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('user_badges').select('user_id', { count: 'exact', head: true }).in('user_id', ids),
    admin.from('client_programs').select('id', { count: 'exact', head: true }).in('client_id', ids),
    admin.from('custom_programs').select('id', { count: 'exact', head: true }).in('user_id', ids),
  ])
  const residual = checks.map(result => result.count ?? 0)
  if (residual.some(count => count !== 0)) throw new Error(`Synthetic Training rows remain: ${residual.join(',')}`)
}
