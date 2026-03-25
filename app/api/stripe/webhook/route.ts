import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature')
    const body = await req.text()
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    // ── Checkout completed (initial subscription) ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const clientId = session.metadata?.clientId
      const coachId = session.metadata?.coachId

      if (clientId) {
        // Activate subscription
        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_end_date: new Date(Date.now() + DURATION_MS).toISOString(),
          stripe_customer_id: session.customer as string || null,
        }).eq('id', clientId)

        // Update payment status
        await supabase.from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_checkout_session_id', session.id)

        // Insert commission (if coach is not platform owner)
        if (coachId && coachId !== 'platform') {
          const { data: coach } = await supabase.from('profiles').select('email').eq('id', coachId).single()
          if (coach?.email !== 'fe.ma@bluewin.ch') {
            await supabase.from('commissions').insert({
              coach_id: coachId,
              amount: 30 * 0.05, // 1.50 CHF
              status: 'pending',
            })
          }
        }
      }
    }

    // ── Invoice paid (monthly renewal) ──
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any
      if (invoice.billing_reason === 'subscription_cycle' && invoice.customer) {
        // Extend subscription by 30 days
        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_end_date: new Date(Date.now() + DURATION_MS).toISOString(),
        }).eq('stripe_customer_id', invoice.customer)

        // Insert payment record
        const { data: client } = await supabase.from('profiles')
          .select('id').eq('stripe_customer_id', invoice.customer).single()
        if (client) {
          await supabase.from('payments').insert({
            client_id: client.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'chf',
            description: 'Renouvellement abonnement mensuel',
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
        await supabase.from('profiles').update({
          subscription_status: 'expired',
        }).eq('stripe_customer_id', sub.customer)
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
  } catch (e: any) {
    console.error('[stripe/webhook]', e.message)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
