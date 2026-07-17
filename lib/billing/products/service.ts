export interface BillingProductPort {
  createProduct(input: { name: string; description: string }): Promise<{ id: string }>
  createPrice(input: {
    product: string
    unitAmount: number
    currency: 'chf'
    interval?: 'month' | 'year'
  }): Promise<{ id: string }>
}

export async function setupBillingProducts(stripe: BillingProductPort) {
  const clientProduct = await stripe.createProduct({
    name: 'MoovX Athena',
    description: 'Coaching fitness IA - Nutrition + Training + Suivi',
  })
  const clientMonthly = await stripe.createPrice({ product: clientProduct.id, unitAmount: 1000, currency: 'chf', interval: 'month' })
  const clientYearly = await stripe.createPrice({ product: clientProduct.id, unitAmount: 8000, currency: 'chf', interval: 'year' })
  const clientLifetime = await stripe.createPrice({ product: clientProduct.id, unitAmount: 15000, currency: 'chf' })

  const coachProduct = await stripe.createProduct({
    name: 'MoovX Coach Pro',
    description: 'Dashboard coach - Clients illimités + IA',
  })
  const coachMonthly = await stripe.createPrice({ product: coachProduct.id, unitAmount: 5000, currency: 'chf', interval: 'month' })

  return {
    message: 'Products and prices created successfully',
    prices: {
      PRICE_CLIENT_MONTHLY: clientMonthly.id,
      PRICE_CLIENT_YEARLY: clientYearly.id,
      PRICE_CLIENT_LIFETIME: clientLifetime.id,
      PRICE_COACH_MONTHLY: coachMonthly.id,
    },
    note: 'Add these price IDs to your .env.local and Vercel environment variables',
  }
}
