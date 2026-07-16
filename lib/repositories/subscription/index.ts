import type { DatabaseClient, Tables } from '@/lib/supabase/types'
import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'

const SUBSCRIPTION_PROJECTION = 'id,subscription_type,subscription_status,subscription_end_date,trial_ends_at' as const
export type SubscriptionFields = Pick<Tables<'profiles'>,
  'id' | 'subscription_type' | 'subscription_status' | 'subscription_end_date' | 'trial_ends_at'>

export interface SubscriptionState extends SubscriptionFields {
  trial: 'active' | 'expired' | 'none' | 'invalid'
  access: 'invited' | 'lifetime' | 'active' | 'inactive'
}

function timeState(value: string | null, now: Date): SubscriptionState['trial'] {
  if (!value) return 'none'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'invalid'
  return timestamp > now.getTime() ? 'active' : 'expired'
}

export function normalizeSubscription(row: SubscriptionFields, now: Date): SubscriptionState {
  const trial = timeState(row.trial_ends_at, now)
  const access = row.subscription_type === 'invited' ? 'invited'
    : row.subscription_type === 'lifetime' || row.subscription_status === 'lifetime' ? 'lifetime'
      : row.subscription_status === 'active' || trial === 'active' ? 'active' : 'inactive'
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
