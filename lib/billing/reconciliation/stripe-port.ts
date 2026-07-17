import type Stripe from 'stripe'
import type { BillingReconciliationStripePort, StripeReadResult } from './types'

function unavailable<T>(error: unknown): StripeReadResult<T> {
  const candidate = error as { statusCode?: unknown; code?: unknown; type?: unknown }
  const notFound = candidate?.statusCode === 404 || candidate?.code === 'resource_missing'
  return { ok: false, reason: notFound ? 'not_found' : 'unavailable' }
}

export function createBillingReconciliationStripePort(stripe: Stripe): BillingReconciliationStripePort {
  return {
    async retrieveCustomer(customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        return { ok: true, value: { deleted: customer.deleted === true } }
      } catch (error) {
        return unavailable(error)
      }
    },
    async retrieveSubscription(subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null
        return { ok: true, value: { status: subscription.status, customerId } }
      } catch (error) {
        return unavailable(error)
      }
    },
    async retrieveConnectAccount(accountId) {
      try {
        const account = await stripe.accounts.retrieve(accountId)
        return {
          ok: true,
          value: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
        }
      } catch (error) {
        return unavailable(error)
      }
    },
    async listRecentCompletedCheckouts({ limit }) {
      try {
        const sessions = await stripe.checkout.sessions.list({ limit })
        return { ok: true, value: sessions.data.filter(session => session.status === 'complete').map(session => ({ id: session.id })) }
      } catch (error) {
        return unavailable(error)
      }
    },
  }
}
