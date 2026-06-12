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

// Helper: mark event as failed for manual reconciliation
async function markEventFailed(eventId: string, errorMessage: string) {
  await getServiceSupabase()
    .from('stripe_webhook_events')
    .update({ processing_status: 'failed', error_message: errorMessage })
    .eq('event_id', eventId)
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

  // ── 2. Dedup: insert event_id (UNIQUE constraint prevents duplicates) ──
  const supabase = getServiceSupabase()
  const { error: dedupError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
    })

  if (dedupError) {
    if (dedupError.code === '23505') {
      // UNIQUE violation → already processed
      console.log('[stripe_webhook] Duplicate event, skipping', { event_id: event.id })
      return new Response(null, { status: 200 })
    }
    // Other DB error → log but return 200 to prevent Stripe retry storm
    console.error('[stripe_webhook] Dedup insert failed', { event_id: event.id, error: dedupError })
    return new Response(null, { status: 200 })
  }

  // ── 3. Process event (all errors → 200 + mark failed, NEVER 400) ──
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
        console.error('[stripe_webhook] metadata rejected:', meta.reason, session.id)
        return NextResponse.json({ received: true })
      }

      const { clientId, subType, isCoachSubscription, coachId } = meta
      const isLifetime = subType === 'client_lifetime'
      const isCoach = subType === 'coach_monthly'

      {
        if (isCoachSubscription && coachId) {
          await supabase.from('profiles').update({
            stripe_customer_id: session.customer as string || null,
            subscription_status: 'active',
            subscription_type: 'coach_paid',
            stripe_subscription_id: session.subscription as string || null,
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', clientId)

          await supabase.from('payments').insert({
            client_id: clientId,
            coach_id: coachId,
            amount: (session.amount_total || 0) / 100,
            currency: 'chf',
            description: 'Abonnement coaching mensuel',
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
          })
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

          await supabase.from('profiles').update(updates).eq('id', clientId)
        }

        // Update payment status
        await supabase.from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_checkout_session_id', session.id)
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
        await supabase.from('profiles').update({
          subscription_status: status,
        }).eq('stripe_customer_id', sub.customer as string)
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
          await supabase.from('profiles').update({
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', client.id)

          await supabase.from('payments').insert({
            client_id: client.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'chf',
            description: `Renouvellement ${client.subscription_type === 'client_yearly' ? 'annuel' : client.subscription_type === 'coach_monthly' ? 'coach' : 'mensuel'}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
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
        await supabase.from('profiles').update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', sub.customer as string)
      }
    }

    // ── Coach Stripe account updated ──
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled && account.payouts_enabled) {
        await supabase.from('profiles')
          .update({ stripe_onboarding_complete: true })
          .eq('stripe_account_id', account.id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown processing error'
    console.error('[stripe_webhook] Processing failed', {
      event_id: event.id,
      event_type: event.type,
      error: message,
    })
    await markEventFailed(event.id, message)
    // Return 200 to prevent Stripe retry storm — event is logged for manual reconciliation
    return NextResponse.json({ received: true, processing_error: true })
  }
}
