import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.error('[coach-checkout] SUPABASE_SERVICE_ROLE_KEY missing')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const { clientId, coachId } = await req.json()
    if (!clientId || !coachId) return NextResponse.json({ error: 'clientId et coachId requis' }, { status: 400 })

    // Fetch coach profile
    const { data: coach } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, coach_monthly_rate, full_name, email')
      .eq('id', coachId)
      .single()

    if (!coach?.stripe_account_id) {
      return NextResponse.json({ error: "Le coach n'a pas encore configuré Stripe" }, { status: 400 })
    }

    const rate = coach.coach_monthly_rate || 50
    const amountCentimes = Math.round(rate * 100)

    // Fetch client
    const { data: client } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', clientId)
      .single()

    // Get or create Stripe customer
    let customerId = client?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client?.email || undefined,
        name: client?.full_name || undefined,
        metadata: { userId: clientId, coachId },
      })
      customerId = customer.id
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', clientId)
    }

    // Create checkout session with transfer to coach
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'chf',
          product_data: {
            name: `Coaching ${coach.full_name || 'MoovX'}`,
            description: `Abonnement mensuel coaching fitness avec ${coach.full_name || 'votre coach'}`,
          },
          unit_amount: amountCentimes,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: {
        application_fee_percent: 3,
        transfer_data: { destination: coach.stripe_account_id },
        metadata: { clientId, coachId, type: 'coach_subscription' },
      },
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/?payment=canceled`,
      metadata: { clientId, coachId, type: 'coach_subscription' },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
