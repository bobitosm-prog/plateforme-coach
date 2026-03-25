import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { clientId, coachId } = await req.json()
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    if (!process.env.STRIPE_PRICE_ID) return NextResponse.json({ error: 'STRIPE_PRICE_ID non configuré' }, { status: 500 })

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'

    // Check if client has a coach with Stripe connected
    let coachStripeAccountId: string | null = null
    let resolvedCoachId = coachId || null
    let coachEmail: string | null = null

    if (resolvedCoachId && resolvedCoachId !== 'platform') {
      const { data: coach } = await supabase
        .from('profiles')
        .select('stripe_account_id, email')
        .eq('id', resolvedCoachId)
        .single()
      coachStripeAccountId = coach?.stripe_account_id || null
      coachEmail = coach?.email || null
    }

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancel`,
      metadata: { clientId, coachId: resolvedCoachId || 'platform' },
    }

    // If coach has Stripe AND is not the platform owner → add transfer with 5% fee
    if (coachStripeAccountId && coachEmail !== 'fe.ma@bluewin.ch') {
      sessionParams.subscription_data = {
        application_fee_percent: 5,
        transfer_data: { destination: coachStripeAccountId },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    await supabase.from('payments').insert({
      coach_id: resolvedCoachId !== 'platform' ? resolvedCoachId : null,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount: 30,
      currency: 'chf',
      description: 'Abonnement coaching mensuel',
      status: 'pending',
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/checkout]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
