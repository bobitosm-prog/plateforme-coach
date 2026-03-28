import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }

export async function POST() {
  try {
    const stripe = getStripe()

    // Product 1: MoovX Coach IA (for autonomous clients)
    const clientProduct = await stripe.products.create({
      name: 'MoovX Coach IA',
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
