import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSecurityAudit } from '@/lib/security/audit-log'
import {
  deliverWebhookEvent,
} from '@/lib/billing/webhook'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe webhook')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
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

  const result = await deliverWebhookEvent({ event, stripe: getStripe(), supabase: getServiceSupabase() })
  if (result.outcome === 'reservation_failed') return NextResponse.json({ error: 'Webhook reservation failed' }, { status: 503 })
  if (result.outcome === 'duplicate') {
    return audit.reject(NextResponse.json({ received: true, duplicate: true }), { event: 'STRIPE_WEBHOOK_REPLAY_SKIPPED', domain: 'stripe', operation: 'claim_webhook', outcome: 'skipped', reason: 'WEBHOOK_ALREADY_PROCESSED', status: 200, context: { event_type: event.type } })
  }
  if (result.outcome === 'already_processing') {
    return audit.reject(NextResponse.json({ error: 'Webhook already processing' }, { status: 409 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'claim_webhook', outcome: 'rejected', reason: 'WEBHOOK_ALREADY_PROCESSING', status: 409, context: { event_type: event.type } })
  }
  if (result.outcome === 'skipped') return NextResponse.json({ received: true, skipped: true })
  if (result.outcome === 'success') return NextResponse.json({ received: true })
  if (result.outcome === 'finalization_failed') {
    const error = result.processingFailed ? 'Webhook processing and finalization failed' : 'Webhook finalization failed'
    if (!result.processingFailed) return NextResponse.json({ error }, { status: 503 })
    return audit.reject(NextResponse.json({ error }, { status: 503 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'process_webhook', outcome: 'failed', reason: result.reason, status: 503, context: { event_type: event.type, finalization_failed: true } })
  }
  return audit.reject(NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 }), { event: 'STRIPE_WEBHOOK_REJECTED', domain: 'stripe', operation: 'process_webhook', outcome: 'failed', reason: result.reason, status: 500, context: { event_type: event.type } })
}
