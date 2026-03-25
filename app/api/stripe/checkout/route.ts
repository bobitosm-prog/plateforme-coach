import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { clientId, coachId } = await req.json()

    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: 'STRIPE_PRICE_ID non configuré' }, { status: 500 })
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/?payment=cancel`,
      metadata: { clientId, coachId },
    })

    await supabase.from('payments').insert({
      coach_id: coachId,
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
