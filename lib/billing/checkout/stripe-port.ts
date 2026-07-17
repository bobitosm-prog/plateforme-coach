import Stripe from 'stripe'
import type { StripeCheckoutPort } from './service'

export function createStripeCheckoutPort(secretKey: string): StripeCheckoutPort {
  const endpoint = process.env.STRIPE_E2E_BASE_URL
  let stripe: Stripe
  if (!endpoint) {
    stripe = new Stripe(secretKey)
  } else {
    if (process.env.MOOVX_E2E !== '1') throw new Error('Stripe E2E endpoint requires MOOVX_E2E=1')
    const url = new URL(endpoint)
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/') {
      throw new Error('Stripe E2E endpoint must be a local HTTP origin')
    }
    stripe = new Stripe(secretKey, { host: url.hostname, port: Number(url.port), protocol: 'http' })
  }

  return {
    async createSession(params, idempotencyKey) {
      return stripe.checkout.sessions.create(params, { idempotencyKey })
    },
    async createCustomer(params) {
      return stripe.customers.create(params)
    },
  }
}
