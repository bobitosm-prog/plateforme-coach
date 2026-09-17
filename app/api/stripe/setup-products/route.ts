import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

function limitedResponse(retryAfter = 3600) {
  return NextResponse.json(
    { error: 'Trop de requêtes' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipLimit = checkRateLimit(`stripe-setup-products:ip:${ip}`, 10, 60 * 60_000)
  if (!ipLimit.allowed) return limitedResponse(ipLimit.retryAfter)

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7).trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userLimit = checkRateLimit(`stripe-setup-products:user:${user.id}`, 2, 60 * 60_000)
    if (!userLimit.allowed) return limitedResponse(userLimit.retryAfter)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim()
    if (!secret) return NextResponse.json({ error: 'Stripe unavailable' }, { status: 500 })
    const stripe = new Stripe(secret)

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
  } catch {
    console.error('[stripe/setup-products] Product setup failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
