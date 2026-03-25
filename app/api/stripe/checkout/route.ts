import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { clientId, coachId, amount, description } = await req.json()

    const { data: coach } = await supabase
      .from('profiles')
      .select('stripe_account_id, full_name')
      .eq('id', coachId)
      .single()

    if (!coach?.stripe_account_id) {
      return NextResponse.json({ error: 'Coach Stripe non connecté' }, { status: 400 })
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'chf',
          product_data: {
            name: `Coaching ${coach.full_name || 'Coach'}`,
            description: description || 'Abonnement coaching',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/?payment=cancel`,
      payment_intent_data: {
        transfer_data: { destination: coach.stripe_account_id },
      },
    })

    await supabase.from('payments').insert({
      coach_id: coachId,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount,
      currency: 'chf',
      description: description || 'Abonnement coaching',
      status: 'pending',
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/checkout]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
