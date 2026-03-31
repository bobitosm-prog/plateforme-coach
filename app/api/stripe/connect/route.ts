import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('SUPABASE_SERVICE_ROLE_KEY manquante — fallback ANON_KEY.')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim())
    const { coachId, email, existingAccountId } = await req.json()
    if (!coachId) return NextResponse.json({ error: 'coachId required' }, { status: 400 })

    let accountId = existingAccountId

    // If no existing account, create a new one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        country: 'CH',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { coachId },
      })
      accountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', coachId)
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
  } catch (e: any) {
    if (e.message?.includes('signed up for Connect') || e.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        error: 'Erreur Stripe Connect: ' + e.message,
        setup_url: 'https://dashboard.stripe.com/connect'
      }, { status: 400 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
