import type { SupabaseClient } from '@supabase/supabase-js'
import type { BillingReconciliationRepository, ReconciliationSnapshot } from './types'

function objectId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const id = (payload as Record<string, unknown>).id
  return typeof id === 'string' ? id : null
}

function assertRead(error: { message?: string } | null, operation: string) {
  if (error) throw new Error(`Billing reconciliation ${operation} failed`)
}

export function createBillingReconciliationRepository(supabase: SupabaseClient): BillingReconciliationRepository {
  return {
    async readSnapshot({ limit }): Promise<ReconciliationSnapshot> {
      const [events, payments, profiles] = await Promise.all([
        supabase.from('stripe_webhook_events')
          .select('event_id,event_type,processing_status,processed_at,processing_started_at,payload')
          .order('processed_at', { ascending: false }).limit(limit),
        supabase.from('payments')
          .select('id,stripe_event_id,stripe_checkout_session_id,status')
          .order('created_at', { ascending: false }).limit(limit),
        supabase.from('profiles')
          .select('id,stripe_customer_id,stripe_subscription_id,stripe_account_id,subscription_status')
          .or('stripe_customer_id.not.is.null,stripe_subscription_id.not.is.null,stripe_account_id.not.is.null')
          .limit(limit),
      ])
      assertRead(events.error, 'webhook read')
      assertRead(payments.error, 'payment read')
      assertRead(profiles.error, 'profile read')
      return {
        webhookEvents: (events.data || []).map(row => ({
          eventId: row.event_id,
          eventType: row.event_type,
          status: row.processing_status,
          processedAt: row.processed_at,
          processingStartedAt: row.processing_started_at,
          objectId: objectId(row.payload),
        })),
        payments: (payments.data || []).map(row => ({
          id: row.id,
          stripeEventId: row.stripe_event_id,
          checkoutSessionId: row.stripe_checkout_session_id,
          status: row.status,
        })),
        profiles: (profiles.data || []).map(row => ({
          id: row.id,
          stripeCustomerId: row.stripe_customer_id,
          stripeSubscriptionId: row.stripe_subscription_id,
          stripeAccountId: row.stripe_account_id,
          subscriptionStatus: row.subscription_status,
        })),
      }
    },
  }
}
