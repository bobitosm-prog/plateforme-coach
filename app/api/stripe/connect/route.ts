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
    const { coachId, email } = await req.json()
    if (!coachId) return NextResponse.json({ error: 'coachId required' }, { status: 400 })

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

    await supabase.from('profiles').update({ stripe_account_id: account.id }).eq('id', coachId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/onboarding-coach?stripe=refresh`,
      return_url: `${appUrl}/onboarding-coach?stripe=success&account=${account.id}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, accountId: account.id })
  } catch (e: any) {
    if (e.message?.includes('signed up for Connect') || e.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        error: 'Stripe Connect n\'est pas encore activé ou erreur de configuration: ' + e.message,
        setup_url: 'https://dashboard.stripe.com/connect'
      }, { status: 400 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
