import type Stripe from 'stripe'
import type { WebhookStripePort } from './service'

export function createWebhookStripePort(stripe: Stripe): WebhookStripePort {
  return {
    retrieveCheckoutSession(id) {
      return stripe.checkout.sessions.retrieve(id, { expand: ['subscription'] })
    },
    retrieveSubscription(id) {
      return stripe.subscriptions.retrieve(id)
    },
    retrieveInvoice(id) {
      return stripe.invoices.retrieve(id, { expand: ['subscription'] })
    },
  }
}
