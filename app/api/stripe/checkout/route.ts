import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSecurityAudit } from '@/lib/security/audit-log'
import {
  CheckoutServiceError,
  createPlatformCheckout,
  createPlatformCheckoutRepository,
  createStripeCheckoutPort,
  type PlatformPlanId,
} from '@/lib/billing/checkout'

const OWNER_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'

function platformError(error: CheckoutServiceError) {
  switch (error.code) {
    case 'INVALID_REQUEST': return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    case 'PROFILE_NOT_FOUND': return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    case 'STRIPE_NOT_CONFIGURED': return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    case 'SERVER_MISCONFIGURED': return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 })
    case 'INVALID_PLAN': return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    case 'ROLE_FORBIDDEN': return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    case 'SUBSCRIPTION_ALREADY_ACTIVE': return NextResponse.json({ error: 'Subscription already active', code: error.code }, { status: 409 })
    case 'SUBSCRIPTION_STATE_UNVERIFIABLE': return NextResponse.json({ error: 'Subscription state unavailable', code: error.code }, { status: 503 })
    default: return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), { event: 'PLATFORM_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })

    const body: unknown = await req.json()
    const repository = createPlatformCheckoutRepository({
      auth: supabaseAuth,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ownerEmail: OWNER_EMAIL,
    })
    const secret = process.env.STRIPE_SECRET_KEY || ''
    const prices: Partial<Record<PlatformPlanId, string | undefined>> = {
      client_monthly: process.env.NEXT_PUBLIC_PRICE_CLIENT_MONTHLY,
      client_yearly: process.env.NEXT_PUBLIC_PRICE_CLIENT_YEARLY,
      client_lifetime: process.env.NEXT_PUBLIC_PRICE_CLIENT_LIFETIME,
      coach_monthly: process.env.NEXT_PUBLIC_PRICE_COACH_MONTHLY,
    }
    const result = await createPlatformCheckout({
      userId: user.id,
      body,
      stripeConfigured: Boolean(secret),
      stripe: () => createStripeCheckoutPort(secret),
      repository,
      priceIds: prices,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch',
    })
    return NextResponse.json({ url: result.url })
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      const response = platformError(error)
      if (error.code === 'ROLE_FORBIDDEN') return audit.reject(response, { event: 'PLATFORM_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'rejected', reason: 'ROLE_FORBIDDEN', status: 403 })
      if (error.code === 'SUBSCRIPTION_ALREADY_ACTIVE') return audit.reject(response, { event: 'PLATFORM_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'rejected', reason: error.code, status: 409 })
      if (error.code === 'SUBSCRIPTION_STATE_UNVERIFIABLE') return audit.reject(response, { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: error.code, status: 503 })
      if (error.code === 'STRIPE_NOT_CONFIGURED' || error.code === 'SERVER_MISCONFIGURED') return audit.reject(response, { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: 'SERVER_MISCONFIGURED', status: 500 })
      return response
    }
    return audit.reject(NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 }), { event: 'PLATFORM_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/checkout', outcome: 'failed', reason: 'UPSTREAM_REJECTED', status: 500 })
  }
}
