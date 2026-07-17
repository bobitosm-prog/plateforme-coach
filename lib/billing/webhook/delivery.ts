import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WEBHOOK_CLAIM_OUTCOMES, isCompletedWebhookClaim } from '@/lib/billing/idempotency'
import { createWebhookBillingRepository } from './repository'
import { createWebhookStripePort } from './stripe-port'
import { processWebhookEvent, SUPPORTED_WEBHOOK_EVENTS, WebhookHandlerError, type WebhookFailureReason } from './service'

export type WebhookDeliveryResult =
  | { outcome: 'reservation_failed' }
  | { outcome: 'duplicate' }
  | { outcome: 'already_processing' }
  | { outcome: 'skipped' }
  | { outcome: 'success' }
  | { outcome: 'processing_failed'; reason: WebhookFailureReason }
  | { outcome: 'finalization_failed'; reason: WebhookFailureReason; processingFailed: boolean }

async function finalizeEvent(
  supabase: SupabaseClient,
  eventId: string,
  status: 'success' | 'failed' | 'skipped',
  message?: string,
) {
  const { data, error } = await supabase.rpc('finalize_stripe_webhook_event', {
    p_event_id: eventId,
    p_status: status,
    p_error_message: message || null,
  })
  if (error || data !== true) throw new Error('Webhook final status persistence failed')
}

export async function deliverWebhookEvent(input: {
  event: Stripe.Event
  stripe: Stripe
  supabase: SupabaseClient
}): Promise<WebhookDeliveryResult> {
  const { event, stripe, supabase } = input
  const { data: claim, error: claimError } = await supabase.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event.data.object,
  })
  if (claimError || claim === WEBHOOK_CLAIM_OUTCOMES.claimFailed || !claim) return { outcome: 'reservation_failed' }
  if (isCompletedWebhookClaim(claim)) return { outcome: 'duplicate' }
  if (claim === WEBHOOK_CLAIM_OUTCOMES.alreadyProcessing) return { outcome: 'already_processing' }

  if (!SUPPORTED_WEBHOOK_EVENTS.has(event.type)) {
    try {
      await finalizeEvent(supabase, event.id, 'skipped')
      return { outcome: 'skipped' }
    } catch {
      return { outcome: 'finalization_failed', reason: 'WEBHOOK_PROCESSING_FAILED', processingFailed: false }
    }
  }

  try {
    await processWebhookEvent(event, {
      stripe: createWebhookStripePort(stripe),
      repository: createWebhookBillingRepository(supabase),
    })
    await finalizeEvent(supabase, event.id, 'success')
    return { outcome: 'success' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error'
    const reason = error instanceof WebhookHandlerError ? error.reason : 'WEBHOOK_PROCESSING_FAILED'
    try {
      await finalizeEvent(supabase, event.id, 'failed', message)
      return { outcome: 'processing_failed', reason }
    } catch {
      return { outcome: 'finalization_failed', reason, processingFailed: true }
    }
  }
}
