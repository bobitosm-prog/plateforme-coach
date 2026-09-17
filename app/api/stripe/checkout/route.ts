import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

type PlanId = 'client_monthly' | 'client_yearly' | 'client_lifetime' | 'coach_monthly'

const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || ''

const PRICE_MAP: Record<PlanId, string | undefined> = {
  client_monthly: process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY,
  client_yearly: process.env.NEXT_PUBLIC_PRICE_CLIENT_YEARLY,
  client_lifetime: process.env.NEXT_PUBLIC_PRICE_CLIENT_LIFETIME,
  coach_monthly: process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY,
}

const PLAN_META: Record<PlanId, {
  mode: 'subscription' | 'payment'
  role: 'client' | 'coach'
  amount: number
  description: string
}> = {
  client_monthly: { mode: 'subscription', role: 'client', amount: 10, description: 'MoovX Athena — Mensuel' },
  client_yearly: { mode: 'subscription', role: 'client', amount: 80, description: 'MoovX Athena — Annuel' },
  client_lifetime: { mode: 'payment', role: 'client', amount: 150, description: 'MoovX Athena — À vie' },
  coach_monthly: { mode: 'subscription', role: 'coach', amount: 50, description: 'MoovX Coach Pro — Mensuel' },
}

const BLOCKING_STATUSES = new Set(['active', 'trialing', 'past_due', 'lifetime'])

function limitedResponse(retryAfter = 60) {
  return NextResponse.json(
    { error: 'Trop de requêtes' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipLimit = checkRateLimit(`stripe-checkout:ip:${ip}`, 20, 60_000)
  if (!ipLimit.allowed) return limitedResponse(ipLimit.retryAfter)

  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userLimit = checkRateLimit(`stripe-checkout:user:${user.id}`, 5, 60_000)
    if (!userLimit.allowed) return limitedResponse(userLimit.retryAfter)

    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const record = body as Record<string, unknown>
    if (Object.keys(record).some(key => key !== 'planId') || typeof record.planId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const planId = record.planId as PlanId
    const plan = PLAN_META[planId]
    if (!plan) return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })

    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role,subscription_status,subscription_type,stripe_subscription_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile unavailable' }, { status: 503 })
    }
    if (profile.role !== plan.role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (
      BLOCKING_STATUSES.has(profile.subscription_status || '')
      || profile.subscription_type === 'lifetime'
      || profile.subscription_type === 'client_lifetime'
      || (profile.stripe_subscription_id && profile.subscription_status !== 'canceled')
    ) {
      return NextResponse.json(
        { error: 'Subscription already active', code: 'SUBSCRIPTION_ALREADY_ACTIVE' },
        { status: 409 },
      )
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const priceId = PRICE_MAP[planId]
    if (!secret || !serviceKey || !supabaseUrl || !priceId) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    let ownerStripeAccountId: string | null = null
    if (OWNER_EMAIL) {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('email', OWNER_EMAIL)
        .maybeSingle()
      if (ownerProfile?.stripe_account_id && ownerProfile.stripe_onboarding_complete) {
        ownerStripeAccountId = ownerProfile.stripe_account_id
      }
    }

    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .insert({
        coach_id: null,
        client_id: user.id,
        stripe_checkout_session_id: null,
        amount: plan.amount,
        currency: 'chf',
        description: plan.description,
        status: 'pending',
      })
      .select('id')
      .single()
    if (paymentError || !payment?.id) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 })
    }

    const metadata = { clientId: user.id, planId, coachId: 'platform', subType: planId }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const isCoachPlan = planId === 'coach_monthly'
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: plan.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}${isCoachPlan ? '/coach?payment=success' : '/?payment=success'}`,
      cancel_url: `${baseUrl}${isCoachPlan ? '/coach?payment=cancel' : '/?payment=cancel'}`,
      metadata,
    }
    if (plan.mode === 'subscription') {
      sessionParams.subscription_data = { metadata: { clientId: user.id, subType: planId } }
    }
    if (ownerStripeAccountId && plan.mode === 'subscription') {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        transfer_data: { destination: ownerStripeAccountId },
      }
    }
    if (ownerStripeAccountId && plan.mode === 'payment') {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: ownerStripeAccountId },
        metadata: { clientId: user.id, subType: planId },
      }
    }

    const stripe = new Stripe(secret)
    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: `checkout-payment-${payment.id}` },
    )

    const { error: attachError } = await admin
      .from('payments')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', payment.id)
      .eq('client_id', user.id)
      .is('coach_id', null)
      .eq('status', 'pending')
      .is('stripe_checkout_session_id', null)
    if (attachError) {
      console.error('[stripe/checkout] Unable to attach the Stripe session to the pending payment')
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch {
    console.error('[stripe/checkout] Checkout failed')
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
