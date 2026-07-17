import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConnectRepository } from './service'

export function createConnectRepository(admin: SupabaseClient): ConnectRepository {
  return {
    async findAccountId(coachId) {
      const { data } = await admin.from('profiles').select('stripe_account_id').eq('id', coachId).single()
      return data?.stripe_account_id || null
    },
    async claimAccountId(coachId, accountId) {
      const { data } = await admin.from('profiles').update({ stripe_account_id: accountId }).eq('id', coachId)
        .is('stripe_account_id', null).select('stripe_account_id').maybeSingle()
      return data?.stripe_account_id || null
    },
  }
}
