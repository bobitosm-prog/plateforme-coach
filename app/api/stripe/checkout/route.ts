import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSecurityAudit } from '@/lib/security/audit-log'

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe checkout')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'

// Static Price ID map — explicit access so Next.js can resolve at build time
const PRICE_MAP: Record<string, string | undefined> = {
  client_monthly:  process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY,
  client_yearly:   process.env.NEXT_PUBLIC_PRICE_CLIENT_YEARLY,
  client_lifetime: process.env.NEXT_PUBLIC_PRICE_CLIENT_LIFETIME,
  coach_monthly:   process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY,
}

// Plan metadata
const PLAN_META: Record<string, { mode: 'subscription' | 'payment'; subType: string; amount: number; description: string }> = {
  client_monthly:  { mode: 'subscription', subType: 'client_monthly',  amount: 10,  description: 'MoovX Athena — Mensuel' },
  client_yearly:   { mode: 'subscription', subType: 'client_yearly',   amount: 80,  description: 'MoovX Athena — Annuel' },
  client_lifetime: { mode: 'payment',      subType: 'client_lifetime', amount: 150, description: 'MoovX Athena — À vie' },
  coach_monthly:   { mode: 'subscription', subType: 'coach_monthly',   amount: 50,  description: 'MoovX Coach Pro — Mensuel' },
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), { event: 'PLATFORM_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })

    const body = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const keys = Object.keys(body)
    if (keys.some(key => key !== 'planId') || typeof body.planId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const resolvedPlanId = body.planId

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role, subscription_status, subscription_type')
      .eq('id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Check Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return audit.reject(NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 }), { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: 'SERVER_MISCONFIGURED', status: 500 })
    }

    // Resolve plan
    const plan = PLAN_META[resolvedPlanId]
    if (!plan) return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    const requiredRole = resolvedPlanId === 'coach_monthly' ? 'coach' : 'client'
    if (profile.role !== requiredRole) {
      return audit.reject(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), { event: 'PLATFORM_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'rejected', reason: 'ROLE_FORBIDDEN', status: 403, context: { requested_plan: resolvedPlanId } })
    }

    // Resolve price ID — static access, no dynamic process.env[key]
    const priceId = PRICE_MAP[resolvedPlanId]
    if (!priceId) {
      return audit.reject(NextResponse.json({ error: 'Price ID non configuré pour ce plan' }, { status: 500 }), { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: 'PRICE_NOT_CONFIGURED', status: 500, context: { requested_plan: resolvedPlanId } })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'

    // Get the platform owner's Stripe Connect account for receiving payments
    const { data: ownerProfile } = await getServiceSupabase()
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('email', OWNER_EMAIL)
      .maybeSingle()
    const ownerStripeAccountId = (ownerProfile?.stripe_account_id && ownerProfile?.stripe_onboarding_complete) ? ownerProfile.stripe_account_id : null

    // Determine redirect based on role
    const isCoachPlan = resolvedPlanId === 'coach_monthly'
    const successPath = isCoachPlan ? '/coach?payment=success' : '/?payment=success'
    const cancelPath = isCoachPlan ? '/coach?payment=cancel' : '/?payment=cancel'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: plan.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: { clientId: user.id, planId: resolvedPlanId, coachId: 'platform', subType: plan.subType },
    }

    // For subscription mode, set subscription_data
    if (plan.mode === 'subscription') {
      sessionParams.subscription_data = { metadata: { clientId: user.id, subType: plan.subType } }
    }

    // If platform owner has Stripe Connect, route payments there
    if (ownerStripeAccountId) {
      if (plan.mode === 'subscription') {
        sessionParams.subscription_data = {
          ...sessionParams.subscription_data,
          transfer_data: { destination: ownerStripeAccountId },
        }
      } else {
        sessionParams.payment_intent_data = {
          transfer_data: { destination: ownerStripeAccountId },
          metadata: { clientId: user.id, subType: plan.subType },
        }
      }
    }

    // FIX: Create Stripe session FIRST with idempotency key, THEN insert payment record
    const idempotencyKey = `checkout-${user.id}-${resolvedPlanId}-${Date.now()}`
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey })

    // Only insert payment record AFTER Stripe session is successfully created
    await getServiceSupabase().from('payments').insert({
      coach_id: null,
      client_id: user.id,
      stripe_checkout_session_id: session.id,
      amount: plan.amount,
      currency: 'chf',
      description: plan.description,
      status: 'pending',
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return audit.reject(NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 }), { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: 'CHECKOUT_FAILED', status: 500 })
  }
}
