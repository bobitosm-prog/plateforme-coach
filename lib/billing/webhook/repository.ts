import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebhookBillingRepository } from './service'

function assertDb(result: { error?: { message?: string } | null }, operation: string) {
  if (result.error) throw new Error(`${operation}: ${result.error.message || 'database error'}`)
}

export function createWebhookBillingRepository(supabase: SupabaseClient): WebhookBillingRepository {
  return {
    async findBeneficiary(clientId) {
      const { data, error } = await supabase.from('profiles').select('id, role').eq('id', clientId).maybeSingle()
      assertDb({ error }, 'beneficiary lookup')
      return data
    },
    async hasActiveCoachRelation(clientId, coachId) {
      const { data, error } = await supabase.from('coach_clients').select('coach_id').eq('client_id', clientId).eq('coach_id', coachId).eq('status', 'active').maybeSingle()
      assertDb({ error }, 'coach relation lookup')
      return Boolean(data)
    },
    async findPlatformPaymentOwner(sessionId) {
      const { data, error } = await supabase.from('payments').select('client_id, coach_id').eq('stripe_checkout_session_id', sessionId).maybeSingle()
      assertDb({ error }, 'checkout payment lookup')
      return data ? { clientId: data.client_id, coachId: data.coach_id } : null
    },
    async updateProfileById(clientId, updates) {
      const result = await supabase.from('profiles').update(updates).eq('id', clientId)
      assertDb(result, 'profile update')
    },
    async updateProfilesByCustomer(customerId, updates) {
      const result = await supabase.from('profiles').update(updates).eq('stripe_customer_id', customerId)
      assertDb(result, 'subscription profile update')
    },
    async findProfileByCustomer(customerId) {
      const { data, error } = await supabase.from('profiles').select('id, subscription_type').eq('stripe_customer_id', customerId).maybeSingle()
      assertDb({ error }, 'renewal profile lookup')
      return data ? { id: data.id, subscriptionType: data.subscription_type } : null
    },
    async updateProfileByConnectAccount(accountId, updates) {
      const result = await supabase.from('profiles').update(updates).eq('stripe_account_id', accountId)
      assertDb(result, 'Stripe account profile update')
    },
    async upsertPayment(payment) {
      const result = await supabase.from('payments').upsert(payment, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
      assertDb(result, 'payment upsert')
    },
    async markPaymentPaid(sessionId, paidAt) {
      const result = await supabase.from('payments').update({ status: 'paid', paid_at: paidAt }).eq('stripe_checkout_session_id', sessionId)
      assertDb(result, 'payment status update')
    },
  }
}
