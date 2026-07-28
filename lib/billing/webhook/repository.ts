import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebhookBillingRepository } from './service'
import { STRIPE_EVENT_ID_CONFLICT_TARGET } from '@/lib/billing/idempotency'

function assertDb(result: { error?: { message?: string } | null }, operation: string) {
  if (result.error) throw new Error(`${operation}: ${result.error.message || 'database error'}`)
}

function paymentFinalizationConflict(): never {
  throw new Error('checkout payment finalization conflict')
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
    async updateSubscriptionByAuthority(customerId, subscriptionId, updates) {
      const result = await supabase.from('profiles').update(updates)
        .eq('stripe_customer_id', customerId).eq('stripe_subscription_id', subscriptionId)
      assertDb(result, 'subscription profile update')
    },
    async findProfileBySubscription(customerId, subscriptionId) {
      const { data, error } = await supabase.from('profiles').select('id, subscription_type')
        .eq('stripe_customer_id', customerId).eq('stripe_subscription_id', subscriptionId).maybeSingle()
      assertDb({ error }, 'renewal profile lookup')
      return data ? { id: data.id, subscriptionType: data.subscription_type } : null
    },
    async updateProfileByConnectAccount(accountId, updates) {
      const result = await supabase.from('profiles').update(updates).eq('stripe_account_id', accountId)
      assertDb(result, 'Stripe account profile update')
    },
    async upsertPayment(payment) {
      const result = await supabase.from('payments').upsert(payment, { onConflict: STRIPE_EVENT_ID_CONFLICT_TARGET, ignoreDuplicates: true })
      assertDb(result, 'payment upsert')
    },
    async finalizePlatformPayment({ sessionId, clientId, eventId, paidAt }) {
      const { data: finalized, error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: paidAt,
          stripe_event_id: eventId,
        })
        .eq('stripe_checkout_session_id', sessionId)
        .eq('client_id', clientId)
        .is('coach_id', null)
        .is('stripe_event_id', null)
        .in('status', ['pending', 'paid'])
        .select('id')
        .maybeSingle()

      if (error?.code === '23505') paymentFinalizationConflict()
      assertDb({ error }, 'checkout payment finalization')
      if (finalized) return 'finalized'

      const { data: current, error: lookupError } = await supabase
        .from('payments')
        .select('status, paid_at, stripe_event_id')
        .eq('stripe_checkout_session_id', sessionId)
        .eq('client_id', clientId)
        .is('coach_id', null)
        .maybeSingle()
      assertDb({ error: lookupError }, 'checkout payment finalization lookup')

      if (
        current?.stripe_event_id === eventId
        && current.status === 'paid'
        && current.paid_at
      ) {
        return 'already_finalized'
      }
      paymentFinalizationConflict()
    },
  }
}
