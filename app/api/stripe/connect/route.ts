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
  const ipLimit = checkRateLimit(`stripe-connect:ip:${ip}`, 20, 60_000)
  if (!ipLimit.allowed) return limitedResponse(ipLimit.retryAfter)

  try {
    const supabaseAuth = await createSupabaseRouteClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userLimit = checkRateLimit(`stripe-connect:user:${user.id}`, 5, 60_000)
    if (!userLimit.allowed) return limitedResponse(userLimit.retryAfter)

    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const coachId = (body as Record<string, unknown>).coachId
    if (typeof coachId !== 'string' || !coachId) {
      return NextResponse.json({ error: 'coachId required' }, { status: 400 })
    }
    if (coachId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('role,email,stripe_account_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile unavailable' }, { status: 503 })
    }
    if (profile.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!secret || !serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Stripe indisponible' }, { status: 500 })
    }

    const stripe = new Stripe(secret)
    const admin = createClient(supabaseUrl, serviceKey)
    let accountId = profile.stripe_account_id as string | null

    if (!accountId) {
      const { data: current } = await admin
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single()
      accountId = current?.stripe_account_id || null
    }

    if (!accountId) {
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
          metadata: { coachId: user.id },
        },
        { idempotencyKey: `connect-account-${user.id}` },
      )
      accountId = account.id

      const { data: claimed } = await admin
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)
        .is('stripe_account_id', null)
        .select('stripe_account_id')
        .maybeSingle()
      if (claimed?.stripe_account_id) {
        accountId = claimed.stripe_account_id
      } else {
        const { data: winner } = await admin
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', user.id)
          .single()
        accountId = winner?.stripe_account_id || accountId
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Stripe indisponible' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/?stripe=refresh`,
      return_url: `${appUrl}/?stripe=success&account=${accountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, accountId })
  } catch {
    console.error('[stripe/connect] Connect onboarding failed')
    return NextResponse.json({ error: 'Erreur Stripe Connect' }, { status: 500 })
  }
}
