import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSecurityAudit } from '@/lib/security/audit-log'
import {
  CheckoutServiceError,
  createCoachCheckoutRepository,
  createCoachCheckout,
  createStripeCheckoutPort,
} from '@/lib/billing/checkout'

function coachError(error: CheckoutServiceError) {
  switch (error.code) {
    case 'INVALID_REQUEST': return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    case 'PROFILE_NOT_FOUND': return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    case 'STRIPE_NOT_CONFIGURED': return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    case 'SERVER_MISCONFIGURED': return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    case 'ROLE_FORBIDDEN':
    case 'RELATION_FORBIDDEN': return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    case 'COACH_NOT_FOUND': return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    case 'COACH_STRIPE_MISSING': return NextResponse.json({ error: "Le coach n'a pas encore configuré Stripe" }, { status: 400 })
    case 'RATE_INVALID': return NextResponse.json({ error: 'Le tarif doit être entre 30 et 500 CHF.' }, { status: 400 })
    default: return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll() } })
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), { event: 'COACH_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/coach-checkout', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })

  try {
    const secret = process.env.STRIPE_SECRET_KEY || ''
    if (!secret) throw new CheckoutServiceError('STRIPE_NOT_CONFIGURED')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) throw new CheckoutServiceError('SERVER_MISCONFIGURED')
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const body: unknown = await req.json()
    const repository = createCoachCheckoutRepository(admin)
    const result = await createCoachCheckout({
      clientId: user.id,
      body,
      stripeConfigured: Boolean(secret),
      stripe: () => createStripeCheckoutPort(secret.trim()),
      repository,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch',
    })
    return NextResponse.json({ url: result.url })
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      const response = coachError(error)
      if (error.code === 'ROLE_FORBIDDEN' || error.code === 'RELATION_FORBIDDEN') return audit.reject(response, { event: 'COACH_CHECKOUT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/coach-checkout', outcome: 'rejected', reason: error.code, status: 403 })
      if (error.code === 'SERVER_MISCONFIGURED') return audit.reject(response, { event: 'COACH_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/coach-checkout', outcome: 'failed', reason: 'SERVER_MISCONFIGURED', status: 500 })
      return response
    }
    return audit.reject(NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 }), { event: 'COACH_CHECKOUT_FAILED', domain: 'stripe', operation: 'POST /api/stripe/coach-checkout', outcome: 'failed', reason: 'CHECKOUT_FAILED', status: 500 })
  }
}
