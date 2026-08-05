import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'
import { personaForRun, type TestPersona } from '../../tests/fixtures/personas'
import {
  assertLocalFixtureEnvironment,
  createLocalPersona,
  upsertCoachClientRelation,
} from '../../tests/fixtures/supabase'

export const MESSAGING_E2E_PASSWORD = 'Local-Messaging-42!'

export type MessagingFixture = {
  coach: TestPersona
  client: TestPersona
  foreignClient: TestPersona
  unrelatedCoach: TestPersona
  ids: string[]
}

export function buildMessagingFixture(suffix: string): MessagingFixture {
  const coach = personaForRun('coach', `${suffix}-coach`)
  const client = personaForRun('client', `${suffix}-client`)
  const foreignClient = personaForRun('secondClient', `${suffix}-foreign-client`)
  const unrelatedCoach = personaForRun('secondCoach', `${suffix}-unrelated-coach`)
  return {
    coach,
    client,
    foreignClient,
    unrelatedCoach,
    ids: [coach.id, client.id, foreignClient.id, unrelatedCoach.id],
  }
}

export async function seedMessagingFixture(
  admin: SupabaseClient<Database>,
  fixture: MessagingFixture,
): Promise<void> {
  await cleanupMessagingFixture(admin, fixture.ids).catch(() => undefined)
  for (const persona of [fixture.coach, fixture.client, fixture.foreignClient, fixture.unrelatedCoach]) {
    await createLocalPersona(admin, persona, MESSAGING_E2E_PASSWORD, {
      full_name: persona.id === fixture.coach.id
        ? 'Coach Messaging E2E'
        : persona.id === fixture.client.id
          ? 'Client Messaging E2E'
          : undefined,
      needs_initial_generation: false,
    })
  }
  await upsertCoachClientRelation(admin, fixture.coach.id, fixture.client.id, 'active')
}

export async function createAuthenticatedMessagingClient({
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
    password: MESSAGING_E2E_PASSWORD,
  })
  if (error || data.user?.id !== persona.id) throw new Error('Unable to authenticate synthetic Messaging persona')
  return client
}

export async function cleanupMessagingFixture(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const unique = [...new Set(ids)]
  if (!unique.length) return
  const failures: string[] = []
  const messages = await admin.from('messages').delete()
    .or(`sender_id.in.(${unique.join(',')}),receiver_id.in.(${unique.join(',')})`)
  if (messages.error) failures.push('messages')
  const relations = await admin.from('coach_clients').delete()
    .or(`coach_id.in.(${unique.join(',')}),client_id.in.(${unique.join(',')})`)
  if (relations.error) failures.push('coach_clients')
  const profiles = await admin.from('profiles').delete().in('id', unique)
  if (profiles.error) failures.push('profiles')
  for (const id of [...unique].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.toLowerCase().includes('not found')) failures.push('auth.users')
  }
  if (failures.length) throw new Error(`Synthetic Messaging cleanup failed at ${[...new Set(failures)].join(', ')}`)
}

export async function assertNoSyntheticMessagingRows(
  admin: SupabaseClient<Database>,
  ids: string[],
): Promise<void> {
  const [messages, relations, profiles, users] = await Promise.all([
    admin.from('messages').select('id', { count: 'exact', head: true })
      .or(`sender_id.in.(${ids.join(',')}),receiver_id.in.(${ids.join(',')})`),
    admin.from('coach_clients').select('id', { count: 'exact', head: true })
      .or(`coach_id.in.(${ids.join(',')}),client_id.in.(${ids.join(',')})`),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (messages.error || relations.error || profiles.error || users.error) {
    throw new Error('Unable to audit synthetic Messaging cleanup')
  }
  const remainingUsers = users.data.users.filter(user => ids.includes(user.id))
  if ((messages.count ?? 0) !== 0 || (relations.count ?? 0) !== 0 || (profiles.count ?? 0) !== 0 || remainingUsers.length !== 0) {
    throw new Error('Synthetic Messaging cleanup left residual rows')
  }
}
