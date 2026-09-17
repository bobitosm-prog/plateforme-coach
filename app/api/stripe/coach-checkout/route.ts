import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

function limitedResponse(retryAfter = 60) {
  return NextResponse.json(
    { error: 'Trop de requêtes' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipLimit = checkRateLimit(`stripe-coach-checkout:ip:${ip}`, 20, 60_000)
  if (!ipLimit.allowed) return limitedResponse(ipLimit.retryAfter)

  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userLimit = checkRateLimit(`stripe-coach-checkout:user:${user.id}`, 5, 60_000)
    if (!userLimit.allowed) return limitedResponse(userLimit.retryAfter)

    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!secret || !serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: caller } = await admin
      .from('profiles')
      .select('role,email,full_name,stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (!caller) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (caller.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: relation, error: relationError } = await admin
      .from('coach_clients')
      .select('coach_id')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (relationError || !relation?.coach_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const coachId = relation.coach_id
    const { data: coach } = await admin
      .from('profiles')
      .select('role,stripe_account_id,coach_monthly_rate,full_name')
      .eq('id', coachId)
      .single()
    if (!coach || coach.role !== 'coach') {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }
    if (!coach.stripe_account_id) {
      return NextResponse.json({ error: "Le coach n'a pas encore configuré Stripe" }, { status: 400 })
    }

    const rawRate = coach.coach_monthly_rate || 50
    if (typeof rawRate !== 'number' || !Number.isFinite(rawRate) || rawRate < 30 || rawRate > 500) {
      return NextResponse.json({ error: 'Le tarif doit être entre 30 et 500 CHF.' }, { status: 400 })
    }
    const amountCentimes = Math.round(Math.round(rawRate * 100) / 100 * 100)
    const stripe = new Stripe(secret)

    let customerId = caller.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: caller.email || user.email || undefined,
        name: caller.full_name || undefined,
        metadata: { userId: user.id, coachId },
      })
      customerId = customer.id
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

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
        metadata: { clientId: user.id, coachId, subType: 'coach_monthly', type: 'coach_subscription' },
      },
      success_url: `${appUrl}/?payment=success`,
      cancel_url: `${appUrl}/?payment=canceled`,
      metadata: { clientId: user.id, coachId, subType: 'coach_monthly', type: 'coach_subscription' },
    }, { idempotencyKey: `coach-checkout-${user.id}-${coachId}-${Date.now()}` })

    return NextResponse.json({ url: session.url })
  } catch {
    console.error('[stripe/coach-checkout] Checkout failed')
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
