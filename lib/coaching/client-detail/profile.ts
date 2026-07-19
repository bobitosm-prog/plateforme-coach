import { createIdentityRepository } from '@/lib/repositories/identity'
import { createCoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'
import { repositoryFailure } from '@/lib/repositories/result'
import type { DatabaseClient, Json } from '@/lib/supabase/types'
import { CLIENT_DETAIL_PROFILE_PROJECTION, type ClientDetailLoadResult, type ClientDetailMutationResult, type ClientDetailProfile, type ClientDetailScope } from './types'

export interface ClientDetailProfileData {
  readonly scope: ClientDetailScope
  readonly profile: ClientDetailProfile
  readonly notes: string
}

export async function updateClientDetailProfile(client: DatabaseClient, scope: ClientDetailScope, changes: Readonly<Record<string, unknown>>): Promise<ClientDetailMutationResult> {
  const result = await client.rpc('update_active_client_profile', { target_client_id: scope.clientUserId, changes: changes as Json })
  return result.error ? { status: 'failure', stage: 'profile' } : { status: 'success', data: undefined }
}

export async function appendClientDetailWeight(client: DatabaseClient, scope: ClientDetailScope, weight: number, date: string): Promise<ClientDetailMutationResult> {
  const result = await client.from('weight_logs').insert({ user_id: scope.clientUserId, poids: weight, date })
  return result.error ? { status: 'failure', stage: 'weight' } : { status: 'success', data: undefined }
}

export async function loadClientDetailProfile(client: DatabaseClient, clientUserId: string): Promise<ClientDetailLoadResult<ClientDetailProfileData>> {
  const identity = await createIdentityRepository(client).getCurrent()
  if (!identity.ok) return identity.kind === 'anonymous' ? { status: 'anonymous' } : { status: 'unavailable', source: 'identity' }

  const scope = { coachUserId: identity.data.id, clientUserId }
  const relation = await createCoachClientRelationRepository(client).findActiveBetween(scope.coachUserId, scope.clientUserId)
  if (!relation.ok) return relation.kind === 'not_found' ? { status: 'forbidden' } : { status: 'unavailable', source: 'relation' }

  const [profileResult, notesResult] = await Promise.all([
    client.from('active_related_profiles').select(CLIENT_DETAIL_PROFILE_PROJECTION).eq('id', clientUserId).maybeSingle(),
    client.from('coach_notes').select('content').eq('coach_id', scope.coachUserId).eq('client_id', clientUserId).maybeSingle(),
  ])
  if (profileResult.error) { repositoryFailure(profileResult.error); return { status: 'unavailable', source: 'profile' } }
  if (!profileResult.data?.id) return { status: 'not_found' }
  return {
    status: 'success',
    data: { scope, profile: profileResult.data as ClientDetailProfile, notes: notesResult.error ? '' : notesResult.data?.content ?? '' },
  }
}
