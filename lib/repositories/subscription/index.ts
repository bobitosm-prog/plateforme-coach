import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import { resolveLegacyRepositoryAccess } from '@/lib/billing/legacy'

const SUBSCRIPTION_PROJECTION = 'id,subscription_type,subscription_status,subscription_end_date,trial_ends_at' as const
export type SubscriptionFields = Pick<Tables<'profiles'>,
  'id' | 'subscription_type' | 'subscription_status' | 'subscription_end_date' | 'trial_ends_at'>

export interface SubscriptionState extends SubscriptionFields {
  trial: 'active' | 'expired' | 'none' | 'invalid'
  access: 'invited' | 'lifetime' | 'active' | 'inactive'
}

export function normalizeSubscription(row: SubscriptionFields, now: Date): SubscriptionState {
  const { access, trial } = resolveLegacyRepositoryAccess(row, now)
  return { ...row, trial, access }
}

export function createSubscriptionRepository(client: DatabaseClient, clock: () => Date = () => new Date()) {
  return {
    async findByProfileId(id: string): Promise<RepositoryResult<SubscriptionState>> {
      const { data, error } = await client.from('profiles').select(SUBSCRIPTION_PROJECTION).eq('id', id).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data: normalizeSubscription(data, clock()) } : { ok: false, kind: 'not_found' }
    },
  }
}

export type SubscriptionRepository = ReturnType<typeof createSubscriptionRepository>
export { SUBSCRIPTION_PROJECTION }
