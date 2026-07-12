import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSecurityAudit } from '@/lib/security/audit-log'

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for Stripe connect')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export async function POST(req: NextRequest) {
  const audit = createSecurityAudit(req)
  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })
    }

    const { coachId } = await req.json()
    if (!coachId) {
      return NextResponse.json({ error: 'coachId required' }, { status: 400 })
    }
    if (coachId !== user.id) {
      return audit.reject(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: 'IDENTITY_MISMATCH', status: 403 })
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role, email, stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return audit.reject(NextResponse.json({ error: 'Profile not found' }, { status: 403 }), { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: 'PROFILE_UNAVAILABLE', status: 403 })
    }
    if (profile.role !== 'coach') {
      return audit.reject(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), { event: 'STRIPE_CONNECT_REJECTED', domain: 'stripe', operation: 'POST /api/stripe/connect', outcome: 'rejected', reason: 'ROLE_FORBIDDEN', status: 403 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
    const supabase = getServiceSupabase()
    let accountId = profile.stripe_account_id

    // If no existing account, check DB first (dedup), then create with idempotency
    if (!accountId) {
      // Check if account already exists in DB (race condition guard)
      const { data: existing } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', coachId)
        .single()

      if (existing?.stripe_account_id) {
        accountId = existing.stripe_account_id
      } else {
        const account = await stripe.accounts.create(
          {
            type: 'express',
            email: profile.email || user.email || undefined,
            country: 'CH',
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: { coachId },
          },
          { idempotencyKey: `connect-account-${coachId}` }
        )
        accountId = account.id

        // Conditional update: only set if still null (anti race condition)
        const { data: updated } = await supabase
          .from('profiles')
          .update({ stripe_account_id: accountId })
          .eq('id', coachId)
          .is('stripe_account_id', null)
          .select('stripe_account_id')
          .maybeSingle()

        // If update returned nothing, someone else set it — use their value
        if (!updated) {
          const { data: refetch } = await supabase
            .from('profiles')
            .select('stripe_account_id')
            .eq('id', coachId)
            .single()
          if (refetch?.stripe_account_id) {
            accountId = refetch.stripe_account_id
          }
        }
      }
    }

    // Create a new onboarding link (works for new AND existing accounts)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/?stripe=refresh`,
      return_url: `${appUrl}/?stripe=success&account=${accountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, accountId })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Stripe Connect error'
    const isStripeError = e instanceof Error && ('type' in e || message.includes('signed up for Connect'))
    if (isStripeError) {
      return NextResponse.json({
        error: 'Erreur Stripe Connect: ' + message,
        setup_url: 'https://dashboard.stripe.com/connect'
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur lors de la configuration Stripe' }, { status: 500 })
  }
}
