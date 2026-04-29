import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe webhook')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature')
    const body = await req.text()
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    // ── Checkout completed ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const clientId = session.metadata?.clientId
      const subType = session.metadata?.subType || session.metadata?.planId || 'client_monthly'
      const isLifetime = subType === 'client_lifetime'
      const isCoach = subType === 'coach_monthly'

      if (clientId) {
        const isCoachSubscription = session.metadata?.type === 'coach_subscription'
        const coachId = session.metadata?.coachId

        if (isCoachSubscription && coachId) {
          // Coach subscription — client pays coach directly
          await getServiceSupabase().from('profiles').update({
            stripe_customer_id: session.customer as string || null,
            subscription_status: 'active',
            subscription_type: 'coach_paid',
            stripe_subscription_id: session.subscription as string || null,
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', clientId)

          await getServiceSupabase().from('payments').insert({
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
          // Standard MoovX subscription
          const updates: Record<string, any> = {
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

          await getServiceSupabase().from('profiles').update(updates).eq('id', clientId)
        }

        // Update payment status
        await getServiceSupabase().from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_checkout_session_id', session.id)
      }
    }

    // ── Subscription updated (plan change, renewal) ──
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      if (sub.customer) {
        const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status
        await getServiceSupabase().from('profiles').update({
          subscription_status: status,
        }).eq('stripe_customer_id', sub.customer as string)
      }
    }

    // ── Invoice paid (renewal) ──
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any
      if (invoice.billing_reason === 'subscription_cycle' && invoice.customer) {
        // Determine interval from subscription type
        const { data: client } = await getServiceSupabase().from('profiles')
          .select('id, subscription_type').eq('stripe_customer_id', invoice.customer).single()

        if (client) {
          const interval = client.subscription_type === 'client_yearly' ? 365 : 30
          await getServiceSupabase().from('profiles').update({
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', client.id)

          await getServiceSupabase().from('payments').insert({
            client_id: client.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'chf',
            description: `Renouvellement ${client.subscription_type === 'client_yearly' ? 'annuel' : client.subscription_type === 'coach_monthly' ? 'coach' : 'mensuel'}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
        }
      }
    }

    // ── Subscription cancelled ──
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as any
      if (sub.customer) {
        await getServiceSupabase().from('profiles').update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', sub.customer)
      }
    }

    // ── Coach Stripe account updated ──
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled && account.payouts_enabled) {
        await getServiceSupabase().from('profiles')
          .update({ stripe_onboarding_complete: true })
          .eq('stripe_account_id', account.id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe/webhook]', e.message)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
