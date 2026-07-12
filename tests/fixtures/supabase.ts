import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TestPersona } from './personas'

export type FixtureMode = 'test' | 'e2e'
export type RelationStatus = 'active' | 'inactive'

export function assertLocalFixtureEnvironment(url: string, mode: FixtureMode | undefined): URL {
  if (mode !== 'test' && mode !== 'e2e') throw new Error('Fixture helpers require explicit test or e2e mode')
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol) || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('Fixture helpers refuse non-local Supabase URLs')
  }
  return parsed
}

export function createLocalAdminClient(options: { url: string; serviceRoleKey: string; mode: FixtureMode }): SupabaseClient {
  assertLocalFixtureEnvironment(options.url, options.mode)
  if (!options.serviceRoleKey) throw new Error('Local service-role key is required')
  return createClient(options.url, options.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function createLocalAuthUser(admin: SupabaseClient, persona: TestPersona, password: string): Promise<string> {
  if (!password) throw new Error('An ephemeral local password is required')
  const { data, error } = await admin.auth.admin.createUser({
    id: persona.id,
    email: persona.email,
    password,
    email_confirm: true,
    user_metadata: { role: persona.role },
  })
  if (error || !data.user) throw new Error(`Unable to create synthetic Auth user: ${error?.message || 'unknown error'}`)
  return data.user.id
}

export async function upsertLocalProfile(admin: SupabaseClient, persona: TestPersona, extra: Record<string, unknown> = {}): Promise<void> {
  const { error } = await admin.from('profiles').upsert({
    id: persona.id,
    email: persona.email,
    full_name: `${persona.role === 'coach' ? 'Coach' : 'Client'} Fixture`,
    role: persona.role,
    subscription_type: persona.subscriptionType,
    subscription_status: persona.subscriptionStatus,
    onboarding_completed: persona.onboardingCompleted,
    coach_onboarding_complete: persona.role === 'coach',
    ...extra,
  })
  if (error) throw new Error(`Unable to upsert synthetic profile: ${error.message}`)
}

export async function createLocalPersona(admin: SupabaseClient, persona: TestPersona, password: string, extra: Record<string, unknown> = {}): Promise<string> {
  const id = await createLocalAuthUser(admin, persona, password)
  try {
    await upsertLocalProfile(admin, persona, extra)
    return id
  } catch (error) {
    await admin.auth.admin.deleteUser(id)
    throw error
  }
}

export async function upsertCoachClientRelation(admin: SupabaseClient, coachId: string, clientId: string, status: RelationStatus = 'active'): Promise<void> {
  const { error } = await admin.from('coach_clients').upsert(
    { coach_id: coachId, client_id: clientId, status },
    { onConflict: 'coach_id,client_id' },
  )
  if (error) throw new Error(`Unable to upsert synthetic coach/client relation: ${error.message}`)
}

export async function setPersonaSubscription(admin: SupabaseClient, id: string, subscriptionType: string | null, subscriptionStatus: string | null): Promise<void> {
  const { error } = await admin.from('profiles').update({ subscription_type: subscriptionType, subscription_status: subscriptionStatus }).eq('id', id)
  if (error) throw new Error(`Unable to update synthetic subscription: ${error.message}`)
}

export async function cleanupLocalPersonas(admin: SupabaseClient, ids: string[]): Promise<void> {
  const uniqueIds = [...new Set(ids)]
  if (!uniqueIds.length) return
  const errors: string[] = []
  for (const operation of [
    () => admin.from('coach_clients').delete().or(`coach_id.in.(${uniqueIds.join(',')}),client_id.in.(${uniqueIds.join(',')})`),
    () => admin.from('profiles').delete().in('id', uniqueIds),
  ]) {
    const { error } = await operation()
    if (error) errors.push(error.message)
  }
  for (const id of uniqueIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error && !error.message.toLowerCase().includes('not found')) errors.push(error.message)
  }
  if (errors.length) throw new Error(`Synthetic fixture cleanup failed (${errors.length} operation(s))`)
}
