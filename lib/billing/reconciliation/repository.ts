import type { SupabaseClient } from '@supabase/supabase-js'
import type { BillingReconciliationRepository, ReconciliationSnapshot } from './types'

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  return typeof record(value)?.id === 'string' ? record(value)?.id as string : null
}

function payloadContract(payload: unknown) {
  const source = record(payload)
  const metadata = record(source?.metadata)
  const parent = record(source?.parent)
  const subscriptionDetails = record(parent?.subscription_details)
  return {
    objectId: stringValue(source?.id),
    clientId: stringValue(metadata?.clientId),
    customerId: stringValue(source?.customer),
    subscriptionId:
      stringValue(source?.subscription)
      || stringValue(subscriptionDetails?.subscription),
    billingReason: stringValue(source?.billing_reason),
  }
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
          .select('id,client_id,stripe_event_id,stripe_checkout_session_id,status')
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
        webhookEvents: (events.data || []).map(row => {
          const contract = payloadContract(row.payload)
          return {
            eventId: row.event_id,
            eventType: row.event_type,
            status: row.processing_status,
            processedAt: row.processed_at,
            processingStartedAt: row.processing_started_at,
            objectId: contract.objectId,
            clientId: contract.clientId,
            customerId: contract.customerId,
            subscriptionId: contract.subscriptionId,
            billingReason: contract.billingReason,
          }
        }),
        payments: (payments.data || []).map(row => ({
          id: row.id,
          clientId: row.client_id,
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
