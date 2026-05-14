import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }

export async function POST() {
  // Auth check — admin only
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only lifetime (admin) users can create Stripe products
  const { data: profile } = await supabase.from('profiles').select('subscription_type').eq('id', user.id).single()
  if (profile?.subscription_type !== 'lifetime') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const stripe = getStripe()

    // Product 1: MoovX Athena (for autonomous clients with AI coach)
    const clientProduct = await stripe.products.create({
      name: 'MoovX Athena',
      description: 'Coaching fitness IA - Nutrition + Training + Suivi',
    })

    const clientMonthly = await stripe.prices.create({
      product: clientProduct.id,
      unit_amount: 1000, // 10 CHF in centimes
      currency: 'chf',
      recurring: { interval: 'month' },
    })

    const clientYearly = await stripe.prices.create({
      product: clientProduct.id,
      unit_amount: 8000, // 80 CHF
      currency: 'chf',
      recurring: { interval: 'year' },
    })

    const clientLifetime = await stripe.prices.create({
      product: clientProduct.id,
      unit_amount: 15000, // 150 CHF
      currency: 'chf',
    })

    // Product 2: MoovX Coach Pro (for coaches)
    const coachProduct = await stripe.products.create({
      name: 'MoovX Coach Pro',
      description: 'Dashboard coach - Clients illimités + IA',
    })

    const coachMonthly = await stripe.prices.create({
      product: coachProduct.id,
      unit_amount: 5000, // 50 CHF
      currency: 'chf',
      recurring: { interval: 'month' },
    })

    return NextResponse.json({
      message: 'Products and prices created successfully',
      prices: {
        PRICE_CLIENT_MONTHLY: clientMonthly.id,
        PRICE_CLIENT_YEARLY: clientYearly.id,
        PRICE_CLIENT_LIFETIME: clientLifetime.id,
        PRICE_COACH_MONTHLY: coachMonthly.id,
      },
      note: 'Add these price IDs to your .env.local and Vercel environment variables',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
