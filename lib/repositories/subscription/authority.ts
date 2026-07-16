import 'server-only'
import type { DatabaseClient, TablesUpdate } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import { normalizeSubscription, SUBSCRIPTION_PROJECTION, type SubscriptionState } from './index'

export type SubscriptionAuthorityUpdate = Pick<TablesUpdate<'profiles'>,
  'subscription_type' | 'subscription_status' | 'subscription_end_date' | 'trial_ends_at'>

export function createSubscriptionAuthorityRepository(client: DatabaseClient, clock: () => Date = () => new Date()) {
  return {
    async updateByProfileId(id: string, patch: SubscriptionAuthorityUpdate): Promise<RepositoryResult<SubscriptionState>> {
      const { data, error } = await client.from('profiles').update(patch).eq('id', id).select(SUBSCRIPTION_PROJECTION).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data: normalizeSubscription(data, clock()) } : { ok: false, kind: 'not_found' }
    },
  }
}
