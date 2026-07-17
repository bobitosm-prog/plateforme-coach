import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSecurityAudit } from '@/lib/security/audit-log'
import {
  SUPPORTED_WEBHOOK_EVENTS,
  WebhookHandlerError,
  createWebhookBillingRepository,
  createWebhookStripePort,
  processWebhookEvent,
} from '@/lib/billing/webhook'
import { WEBHOOK_CLAIM_OUTCOMES, isCompletedWebhookClaim } from '@/lib/billing/idempotency'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe webhook')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

async function finalizeEvent(supabase: ReturnType<typeof getServiceSupabase>, eventId: string, status: 'success' | 'failed' | 'skipped', message?: string) {
  const { data, error } = await supabase.rpc('finalize_stripe_webhook_event', {
    p_event_id: eventId,
    p_status: status,
    p_error_message: message || null,
  })
  if (error || data !== true) throw new Error('Webhook final status persistence failed')
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return audit.reject(NextResponse.json({ error: 'Missing signature' }, { status: 400 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/webhook', outcome: 'rejected', reason: 'SIGNATURE_REQUIRED', status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification failed'
    return audit.reject(NextResponse.json({ error: message }, { status: 400 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/webhook', outcome: 'rejected', reason: 'SIGNATURE_INVALID', status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data: claim, error: claimError } = await supabase.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event.data.object,
  })
  if (claimError || claim === WEBHOOK_CLAIM_OUTCOMES.claimFailed || !claim) {
    return NextResponse.json({ error: 'Webhook reservation failed' }, { status: 503 })
  }
  if (isCompletedWebhookClaim(claim)) {
    return audit.reject(NextResponse.json({ received: true, duplicate: true }), { event: 'STRIPE_WEBHOOK_REPLAY_SKIPPED', domain: 'stripe', operation: 'claim_webhook', outcome: 'skipped', reason: 'WEBHOOK_ALREADY_PROCESSED', status: 200, context: { event_type: event.type } })
  }
  if (claim === WEBHOOK_CLAIM_OUTCOMES.alreadyProcessing) {
    return audit.reject(NextResponse.json({ error: 'Webhook already processing' }, { status: 409 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'claim_webhook', outcome: 'rejected', reason: 'WEBHOOK_ALREADY_PROCESSING', status: 409, context: { event_type: event.type } })
  }

  if (!SUPPORTED_WEBHOOK_EVENTS.has(event.type)) {
    try {
      await finalizeEvent(supabase, event.id, 'skipped')
      return NextResponse.json({ received: true, skipped: true })
    } catch {
      return NextResponse.json({ error: 'Webhook finalization failed' }, { status: 503 })
    }
  }

  try {
    const stripe = getStripe()
    await processWebhookEvent(event, {
      stripe: createWebhookStripePort(stripe),
      repository: createWebhookBillingRepository(supabase),
    })
    await finalizeEvent(supabase, event.id, 'success')
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error'
    const reason = error instanceof WebhookHandlerError ? error.reason : 'WEBHOOK_PROCESSING_FAILED'
    try {
      await finalizeEvent(supabase, event.id, 'failed', message)
    } catch {
      return audit.reject(NextResponse.json({ error: 'Webhook processing and finalization failed' }, { status: 503 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'process_webhook', outcome: 'failed', reason, status: 503, context: { event_type: event.type, finalization_failed: true } })
    }
    return audit.reject(NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'process_webhook', outcome: 'failed', reason, status: 500, context: { event_type: event.type } })
  }
}
