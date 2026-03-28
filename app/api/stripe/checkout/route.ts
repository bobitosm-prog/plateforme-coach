import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY manquante — utilisation de ANON_KEY en fallback.')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'

// Plan config — maps planId to Stripe price_id and mode
const PLAN_CONFIG: Record<string, { envKey: string; mode: 'subscription' | 'payment'; subType: string; amount: number; description: string }> = {
  client_monthly:  { envKey: 'NEXT_PUBLIC_PRICE_CLIENT_MONTHLY',  mode: 'subscription', subType: 'client_monthly',  amount: 10,  description: 'MoovX Coach IA — Mensuel' },
  client_yearly:   { envKey: 'NEXT_PUBLIC_PRICE_CLIENT_YEARLY',   mode: 'subscription', subType: 'client_yearly',   amount: 80,  description: 'MoovX Coach IA — Annuel' },
  client_lifetime: { envKey: 'NEXT_PUBLIC_PRICE_CLIENT_LIFETIME', mode: 'payment',      subType: 'client_lifetime', amount: 150, description: 'MoovX Coach IA — À vie' },
  coach_monthly:   { envKey: 'NEXT_PUBLIC_PRICE_COACH_MONTHLY',   mode: 'subscription', subType: 'coach_monthly',   amount: 50,  description: 'MoovX Coach Pro — Mensuel' },
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, planId, coachId } = await req.json()
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    // Resolve plan
    const plan = PLAN_CONFIG[planId || 'client_monthly']
    if (!plan) return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })

    const priceId = process.env[plan.envKey]
    if (!priceId) return NextResponse.json({ error: `Price ID non configuré : ${plan.envKey}. Ajoutez-le dans les variables d'environnement Vercel.` }, { status: 500 })

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'

    // Get the platform owner's Stripe Connect account for receiving payments
    // Only use transfer_data if the owner has a fully onboarded Stripe account
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('email', OWNER_EMAIL)
      .single()
    const ownerStripeAccountId = (ownerProfile?.stripe_account_id && ownerProfile?.stripe_onboarding_complete) ? ownerProfile.stripe_account_id : null

    // Determine redirect based on role
    const isCoachPlan = planId === 'coach_monthly'
    const successPath = isCoachPlan ? '/coach?payment=success' : '/?payment=success'
    const cancelPath = isCoachPlan ? '/coach?payment=cancel' : '/?payment=cancel'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: plan.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: { clientId, planId: planId || 'client_monthly', coachId: coachId || 'platform', subType: plan.subType },
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

    console.log('[stripe/checkout] Creating session:', {
      planId, priceId, mode: plan.mode, ownerStripeAccountId,
      hasTransfer: !!ownerStripeAccountId,
      envKeys: { STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY, [plan.envKey]: !!process.env[plan.envKey], STRIPE_PRICE_ID: !!process.env.STRIPE_PRICE_ID },
    })

    const session = await stripe.checkout.sessions.create(sessionParams)

    await supabase.from('payments').insert({
      coach_id: coachId && coachId !== 'platform' ? coachId : null,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount: plan.amount,
      currency: 'chf',
      description: plan.description,
      status: 'pending',
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/checkout] ERROR:', {
      message: e.message,
      type: e.type,
      code: e.code,
      statusCode: e.statusCode,
      raw: e.raw?.message,
    })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
