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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.error('[coach-checkout] SUPABASE_SERVICE_ROLE_KEY missing')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const body = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (callerProfile.role !== 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: relation } = await supabaseAdmin
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (!relation?.coach_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const clientId = user.id
    const coachId = relation.coach_id

    // Fetch coach profile
    const { data: coach } = await supabaseAdmin
      .from('profiles')
      .select('role, stripe_account_id, coach_monthly_rate, full_name, email')
      .eq('id', coachId)
      .single()

    if (!coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    if (coach.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!coach.stripe_account_id) {
      return NextResponse.json({ error: "Le coach n'a pas encore configuré Stripe" }, { status: 400 })
    }

    const MIN_COACH_RATE = 30
    const MAX_COACH_RATE = 500
    const rawRate = coach.coach_monthly_rate || 50
    if (
      typeof rawRate !== 'number' ||
      !Number.isFinite(rawRate) ||
      rawRate < MIN_COACH_RATE ||
      rawRate > MAX_COACH_RATE
    ) {
      return NextResponse.json(
        { error: `Le tarif doit être entre ${MIN_COACH_RATE} et ${MAX_COACH_RATE} CHF.` },
        { status: 400 }
      )
    }
    const rate = Math.round(rawRate * 100) / 100
    const amountCentimes = Math.round(rate * 100)

    // Fetch client
    const { data: client } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', clientId)
      .single()

    if (!client) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())

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

    // Create checkout session with transfer to coach + idempotency key
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const idempotencyKey = `coach-checkout-${clientId}-${coachId}-${Date.now()}`
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
        metadata: { clientId, coachId, subType: 'coach_monthly', type: 'coach_subscription' },
      },
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/?payment=canceled`,
      metadata: { clientId, coachId, subType: 'coach_monthly', type: 'coach_subscription' },
    }, { idempotencyKey })

    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Coach checkout error'
    console.error('[stripe/coach-checkout] ERROR:', { message })
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
