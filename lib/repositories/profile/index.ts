import type { DatabaseClient, Tables, TablesUpdate, Views } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import { createIdentityRepository } from '@/lib/repositories/identity'

const PROFILE_PROJECTION = 'id,email,full_name,avatar_url,role,status,onboarding_completed,preferred_locale,created_at,updated_at' as const
const RELATED_PROFILE_PROJECTION = 'id,full_name,avatar_url,status,subscription_type,created_at' as const

export type ProfileSummary = Pick<Tables<'profiles'>,
  'id' | 'email' | 'full_name' | 'avatar_url' | 'role' | 'status' | 'onboarding_completed' | 'preferred_locale' | 'created_at' | 'updated_at'>
export type RelatedProfileSummary = Pick<Views<'active_related_profiles'>,
  'id' | 'full_name' | 'avatar_url' | 'status' | 'subscription_type' | 'created_at'>

export type SafeProfileUpdate = Pick<TablesUpdate<'profiles'>,
  'full_name' | 'avatar_url' | 'phone' | 'preferred_locale' | 'dietary_type' | 'allergies' | 'meal_preferences' |
  'current_weight' | 'target_weight' | 'height' | 'activity_level' | 'objective'>

export function createProfileRepository(client: DatabaseClient) {
  return {
    async findById(id: string): Promise<RepositoryResult<ProfileSummary>> {
      const { data, error } = await client.from('profiles').select(PROFILE_PROJECTION).eq('id', id).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
    async findCurrent(): Promise<RepositoryResult<ProfileSummary>> {
      const identity = await createIdentityRepository(client).getCurrent()
      if (!identity.ok) {
        if (identity.kind === 'anonymous') return { ok: false, kind: 'not_found' }
        return { ok: false, kind: 'failure', error: identity.error }
      }
      return this.findById(identity.data.id)
    },
    async findActiveRelatedById(id: string): Promise<RepositoryResult<RelatedProfileSummary>> {
      const { data, error } = await client.from('active_related_profiles').select(RELATED_PROFILE_PROJECTION).eq('id', id).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
    async updateSafe(id: string, patch: SafeProfileUpdate): Promise<RepositoryResult<ProfileSummary>> {
      const { data, error } = await client.from('profiles').update(patch).eq('id', id).select(PROFILE_PROJECTION).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },
  }
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>
