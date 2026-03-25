import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature')
    const body = await req.text()

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      await supabase.from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('stripe_checkout_session_id', session.id)
    }

    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription
      const meta = sub.metadata || {}
      if (meta.clientId) {
        await supabase.from('payments').insert({
          client_id: meta.clientId,
          coach_id: meta.coachId || null,
          amount: 30,
          currency: 'chf',
          description: 'Abonnement coaching mensuel',
          status: 'active',
          paid_at: new Date().toISOString(),
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const meta = sub.metadata || {}
      if (meta.clientId) {
        await supabase.from('payments')
          .update({ status: 'cancelled' })
          .eq('client_id', meta.clientId)
          .eq('status', 'active')
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any
      if (invoice.subscription && invoice.metadata) {
        await supabase.from('payments').insert({
          client_id: invoice.metadata.clientId || null,
          coach_id: invoice.metadata.coachId || null,
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency || 'chf',
          description: 'Paiement abonnement mensuel',
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
      }
    }

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
