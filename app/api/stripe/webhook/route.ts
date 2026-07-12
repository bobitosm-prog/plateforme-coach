import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { parseCheckoutMetadata } from '../../../../lib/stripe/metadata'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe webhook')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'invoice.payment_succeeded',
  'customer.subscription.deleted',
  'account.updated',
])

async function finalizeEvent(supabase: ReturnType<typeof getServiceSupabase>, eventId: string, status: 'success' | 'failed' | 'skipped', message?: string) {
  const { data, error } = await supabase.rpc('finalize_stripe_webhook_event', {
    p_event_id: eventId,
    p_status: status,
    p_error_message: message || null,
  })
  if (error || data !== true) throw new Error('Webhook final status persistence failed')
}

function assertDb(result: { error?: { message?: string } | null }, operation: string) {
  if (result.error) throw new Error(`${operation}: ${result.error.message || 'database error'}`)
}

export async function POST(req: NextRequest) {
  // ── 1. Verify Stripe signature ──
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[stripe_webhook] Signature invalid', { error: message })
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // ── 2. Atomic claim/reclaim. event_id remains the concurrency lock. ──
  const supabase = getServiceSupabase()
  const { data: claim, error: claimError } = await supabase.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event.data.object,
  })
  if (claimError || claim === 'claim_failed' || !claim) {
    return NextResponse.json({ error: 'Webhook reservation failed' }, { status: 503 })
  }
  if (claim === 'already_success' || claim === 'already_skipped') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claim === 'already_processing') {
    return NextResponse.json({ error: 'Webhook already processing' }, { status: 409 })
  }

  if (!SUPPORTED_EVENTS.has(event.type)) {
    try {
      await finalizeEvent(supabase, event.id, 'skipped')
      return NextResponse.json({ received: true, skipped: true })
    } catch {
      return NextResponse.json({ error: 'Webhook finalization failed' }, { status: 503 })
    }
  }

  // ── 3. Process event (all errors are persisted as failed and remain retryable) ──
  const stripe = getStripe()

  try {
    // ── Checkout completed ──
    if (event.type === 'checkout.session.completed') {
      // Defense in depth: refetch from Stripe
      const session = await stripe.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
        { expand: ['subscription'] }
      )
      const meta = parseCheckoutMetadata(session.metadata as Record<string, string> | null)
      if (!meta.ok) {
        throw new Error(`Invalid checkout metadata: ${meta.reason}`)
      }

      const { clientId, subType, isCoachSubscription, coachId } = meta
      const { data: beneficiary, error: beneficiaryError } = await supabase.from('profiles')
        .select('id, role')
        .eq('id', clientId)
        .maybeSingle()
      assertDb({ error: beneficiaryError }, 'beneficiary lookup')
      if (!beneficiary) throw new Error('Checkout beneficiary not found')

      const requiredRole = subType === 'coach_monthly' && !isCoachSubscription ? 'coach' : 'client'
      if (beneficiary.role !== requiredRole) throw new Error('Checkout offer/role mismatch')

      if (isCoachSubscription) {
        if (subType !== 'coach_monthly' || !coachId) throw new Error('Invalid coach checkout metadata')
        const { data: relation, error: relationError } = await supabase.from('coach_clients')
          .select('coach_id')
          .eq('client_id', clientId)
          .eq('coach_id', coachId)
          .eq('status', 'active')
          .maybeSingle()
        assertDb({ error: relationError }, 'coach relation lookup')
        if (!relation) throw new Error('Coach relation mismatch')
      } else {
        if (coachId) throw new Error('Unexpected coach authority for platform checkout')
        const { data: payment, error: paymentError } = await supabase.from('payments')
          .select('client_id, coach_id')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle()
        assertDb({ error: paymentError }, 'checkout payment lookup')
        if (!payment || payment.client_id !== clientId || payment.coach_id !== null) {
          throw new Error('Checkout payment ownership mismatch')
        }
      }
      const isLifetime = subType === 'client_lifetime'
      const isCoach = subType === 'coach_monthly'

      {
        if (isCoachSubscription && coachId) {
          const profileResult = await supabase.from('profiles').update({
            stripe_customer_id: session.customer as string || null,
            subscription_status: 'active',
            subscription_type: 'coach_paid',
            stripe_subscription_id: session.subscription as string || null,
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', clientId)
          assertDb(profileResult, 'coach subscription profile update')

          const paymentResult = await supabase.from('payments').upsert({
            client_id: clientId,
            coach_id: coachId,
            amount: (session.amount_total || 0) / 100,
            currency: 'chf',
            description: 'Abonnement coaching mensuel',
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
            stripe_event_id: event.id,
          }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
          assertDb(paymentResult, 'coach payment insert')
        } else {
          const updates: Record<string, unknown> = {
            stripe_customer_id: session.customer as string || null,
            subscription_type: subType,
          }

          if (isLifetime) {
            updates.subscription_status = 'lifetime'
            updates.subscription_end_date = null
          } else {
            const interval = subType === 'client_yearly' ? 365 : 30
            updates.subscription_status = 'active'
            updates.subscription_end_date = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString()
            updates.stripe_subscription_id = session.subscription as string || null
          }

          if (isCoach) {
            updates.coach_subscription_active = true
          }

          const profileResult = await supabase.from('profiles').update(updates).eq('id', clientId)
          assertDb(profileResult, 'platform subscription profile update')
        }

        // Update payment status
        const paymentStatusResult = await supabase.from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_checkout_session_id', session.id)
        assertDb(paymentStatusResult, 'payment status update')
      }
    }

    // ── Subscription updated (plan change, renewal) ──
    if (event.type === 'customer.subscription.updated') {
      // Defense in depth: refetch from Stripe
      const sub = await stripe.subscriptions.retrieve(
        (event.data.object as Stripe.Subscription).id
      )
      if (sub.customer) {
        const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status
        const result = await supabase.from('profiles').update({
          subscription_status: status,
        }).eq('stripe_customer_id', sub.customer as string)
        assertDb(result, 'subscription status update')
      }
    }

    // ── Invoice paid (renewal) ──
    if (event.type === 'invoice.payment_succeeded') {
      // Defense in depth: refetch from Stripe
      const invoice = await stripe.invoices.retrieve(
        (event.data.object as Stripe.Invoice).id,
        { expand: ['subscription'] }
      )
      if (invoice.billing_reason === 'subscription_cycle' && invoice.customer) {
        // maybeSingle: returns null if no match (prevents throw on 0 results)
        const { data: client } = await supabase.from('profiles')
          .select('id, subscription_type')
          .eq('stripe_customer_id', invoice.customer as string)
          .maybeSingle()

        if (client) {
          const interval = client.subscription_type === 'client_yearly' ? 365 : 30
          const profileResult = await supabase.from('profiles').update({
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', client.id)
          assertDb(profileResult, 'renewal profile update')

          const paymentResult = await supabase.from('payments').upsert({
            client_id: client.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'chf',
            description: `Renouvellement ${client.subscription_type === 'client_yearly' ? 'annuel' : client.subscription_type === 'coach_monthly' ? 'coach' : 'mensuel'}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_event_id: event.id,
          }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
          assertDb(paymentResult, 'renewal payment insert')
        } else {
          console.error('[stripe_webhook] invoice.payment_succeeded: client not found', {
            event_id: event.id,
            customer: invoice.customer,
          })
        }
      }
    }

    // ── Subscription cancelled ──
    if (event.type === 'customer.subscription.deleted') {
      const sub = await stripe.subscriptions.retrieve(
        (event.data.object as Stripe.Subscription).id
      )
      if (sub.customer) {
        const result = await supabase.from('profiles').update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', sub.customer as string)
        assertDb(result, 'subscription cancellation update')
      }
    }

    // ── Coach Stripe account updated ──
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled && account.payouts_enabled) {
        const result = await supabase.from('profiles')
          .update({ stripe_onboarding_complete: true })
          .eq('stripe_account_id', account.id)
        assertDb(result, 'Stripe account profile update')
      }
    }

    await finalizeEvent(supabase, event.id, 'success')
    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'
    console.error('[stripe_webhook] Processing failed', {
      event_id: event.id,
      event_type: event.type,
      error: message,
    })
    try {
      await finalizeEvent(supabase, event.id, 'failed', message)
    } catch {
      return NextResponse.json({ error: 'Webhook processing and finalization failed' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
