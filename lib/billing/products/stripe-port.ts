import Stripe from 'stripe'
import type { BillingProductPort } from './service'

export function createBillingProductPort(secretKey: string): BillingProductPort {
  const stripe = new Stripe(secretKey)
  return {
    createProduct(input) {
      return stripe.products.create(input)
    },
    createPrice(input) {
      return stripe.prices.create({
        product: input.product,
        unit_amount: input.unitAmount,
        currency: input.currency,
        ...(input.interval ? { recurring: { interval: input.interval } } : {}),
      })
    },
  }
}
