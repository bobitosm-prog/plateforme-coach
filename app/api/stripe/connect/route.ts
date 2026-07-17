import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSecurityAudit } from '@/lib/security/audit-log'
import {
  ConnectServiceError,
  assertCoachAuthority,
  createConnectRepository,
  createConnectOnboarding,
  createStripeConnectPort,
  readRequestedCoachId,
} from '@/lib/billing/connect'

function connectError(error: ConnectServiceError) {
  switch (error.code) {
    case 'INVALID_REQUEST': return NextResponse.json({ error: 'coachId required' }, { status: 400 })
    case 'IDENTITY_MISMATCH': return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    case 'PROFILE_UNAVAILABLE': return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    case 'ROLE_FORBIDDEN': return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    case 'STRIPE_NOT_CONFIGURED': return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    case 'PROVIDER_ERROR': return NextResponse.json({
      error: 'Erreur Stripe Connect',
      setup_url: 'https://dashboard.stripe.com/connect',
    }, { status: 400 })
    default: return NextResponse.json({ error: 'Erreur lors de la configuration Stripe' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })
    }
    const requestedCoachId = readRequestedCoachId(await req.json())
    if (requestedCoachId !== user.id) throw new ConnectServiceError('IDENTITY_MISMATCH')
    const { data: rawProfile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role, email, stripe_account_id')
      .eq('id', user.id)
      .single()
    const profile = assertCoachAuthority({
      authenticatedUserId: user.id,
      requestedCoachId,
      profile: profileError || !rawProfile ? null : {
        role: rawProfile.role,
        email: rawProfile.email,
        stripeAccountId: rawProfile.stripe_account_id,
      },
    })

    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) throw new ConnectServiceError('STRIPE_NOT_CONFIGURED')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) throw new ConnectServiceError('SERVER_MISCONFIGURED')
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const repository = createConnectRepository(admin)
    const result = await createConnectOnboarding({
      coachId: user.id,
      profileEmail: profile.email,
      sessionEmail: user.email || null,
      storedAccountId: profile.stripeAccountId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch',
      stripe: createStripeConnectPort(secret),
      repository,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ConnectServiceError) {
      const response = connectError(error)
      if (error.code === 'IDENTITY_MISMATCH' || error.code === 'PROFILE_UNAVAILABLE' || error.code === 'ROLE_FORBIDDEN') {
        return audit.reject(response, { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: error.code, status: 403 })
      }
      return response
    }
    return NextResponse.json({ error: 'Erreur lors de la configuration Stripe' }, { status: 500 })
  }
}
