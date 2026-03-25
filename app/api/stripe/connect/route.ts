// NOTE: SUPABASE_SERVICE_ROLE_KEY is required for secure server-side operations.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY manquante — utilisation de ANON_KEY en fallback.')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { coachId } = await req.json()
    if (!coachId) return NextResponse.json({ error: 'coachId required' }, { status: 400 })

    const account = await getStripe().accounts.create({
      type: 'express',
      country: 'CH',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    await supabase.from('profiles').update({ stripe_account_id: account.id }).eq('id', coachId)

    const accountLink = await getStripe().accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/coach?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_URL || 'https://plateforme-coach-delta.vercel.app'}/coach?stripe=success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (e: any) {
    console.error('[stripe/connect]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
