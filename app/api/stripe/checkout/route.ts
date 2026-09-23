import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { findActiveCoachForClient, resolveCoachRelationAuthority } from '@/lib/coach-relations/repository'

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe checkout')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  try {
    const auth = await createSupabaseRouteClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const limit = checkRateLimit(`platform-checkout:${user.id}`, 5, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessaie plus tard.' }, {
      status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) },
    })
    const body: unknown = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
    const { clientId, planId, coachId } = body as Record<string, unknown>
    if (typeof clientId !== 'string' || !UUID_RE.test(clientId)) {
      return NextResponse.json({ error: 'clientId invalide' }, { status: 400 })
    }
    // Never create a privileged payment for a client selected by the caller.
    if (clientId !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const resolvedPlanId = planId ?? 'client_monthly'
    if (typeof resolvedPlanId !== 'string' || !Object.hasOwn(PLAN_META, resolvedPlanId)) {
      return NextResponse.json({ error: 'Offre invalide' }, { status: 400 })
    }
    const { data: profile, error: profileError } = await auth.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503 })
    if (!profile || (resolvedPlanId === 'coach_monthly' ? profile.role !== 'coach' : profile.role !== 'client')) {
      return NextResponse.json({ error: 'Offre non autorisée' }, { status: 403 })
    }
    let verifiedCoachId: string | null = null
    if (coachId != null && coachId !== 'platform') {
      if (typeof coachId !== 'string' || !UUID_RE.test(coachId)) return NextResponse.json({ error: 'Coach invalide' }, { status: 400 })
      const lookup = await findActiveCoachForClient(auth, user.id)
      if (lookup.kind === 'error' || lookup.kind === 'multiple_active') {
        return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503 })
      }
      const authority = resolveCoachRelationAuthority(lookup)
      if (!authority.isAuthoritative || authority.relation?.coach_id !== coachId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      verifiedCoachId = authority.relation.coach_id
    }

    // Check Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[checkout] STRIPE_SECRET_KEY is missing')
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    }

    // Resolve plan
    const plan = PLAN_META[resolvedPlanId]

    // Resolve price ID — static access, no dynamic process.env[key]
    const priceId = PRICE_MAP[resolvedPlanId]
    if (!priceId) {
      console.error('[checkout] Price ID missing for plan:', resolvedPlanId, 'Available:', Object.entries(PRICE_MAP).map(([k, v]) => `${k}=${v ? 'SET' : 'MISSING'}`))
      return NextResponse.json({ error: 'Price ID non configuré pour ce plan' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'

    // Get the platform owner's Stripe Connect account for receiving payments
    const admin = getServiceSupabase()
    const { data: ownerProfile, error: ownerError } = await admin
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('email', OWNER_EMAIL)
      .maybeSingle()
    if (ownerError) return NextResponse.json({ error: 'Paiement temporairement indisponible' }, { status: 503 })
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
      metadata: { clientId: user.id, planId: resolvedPlanId, coachId: verifiedCoachId || 'platform', subType: plan.subType },
    }

    // For subscription mode, set subscription_data
    if (plan.mode === 'subscription') {
      sessionParams.subscription_data = { metadata: { clientId, subType: plan.subType } }
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
          metadata: { clientId, subType: plan.subType },
        }
      }
    }

    // FIX: Create Stripe session FIRST with idempotency key, THEN insert payment record
    const idempotencyKey = `checkout-${clientId}-${resolvedPlanId}-${Date.now()}`
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey })

    // Only insert payment record AFTER Stripe session is successfully created
    const { error: paymentError } = await admin.from('payments').insert({
      coach_id: verifiedCoachId,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount: plan.amount,
      currency: 'chf',
      description: plan.description,
      status: 'pending',
    })
    if (paymentError) {
      // No redirect to an untracked checkout. Best-effort expiration, no raw provider errors.
      await stripe.checkout.sessions.expire(session.id).catch(() => {
        console.error('[stripe/checkout] UNTRACKED_CHECKOUT_EXPIRATION_FAILED')
      })
      console.error('[stripe/checkout] PAYMENT_RECORD_FAILED')
      return NextResponse.json({ error: 'Paiement temporairement indisponible' }, { status: 503 })
    }

    return NextResponse.json({ url: session.url })
  } catch {
    console.error('[stripe/checkout] CHECKOUT_FAILED')
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
