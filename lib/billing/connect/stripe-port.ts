import Stripe from 'stripe'
import { ConnectServiceError, type StripeConnectPort } from './service'

export function createStripeConnectPort(secretKey: string): StripeConnectPort {
  const stripe = new Stripe(secretKey.trim())
  const providerCall = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation()
    } catch {
      throw new ConnectServiceError('PROVIDER_ERROR')
    }
  }

  return {
    createAccount(input) {
      return providerCall(() => stripe.accounts.create({
        type: 'express',
        email: input.email,
        country: 'CH',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { coachId: input.coachId },
      }, { idempotencyKey: input.idempotencyKey }))
    },
    createAccountLink(input) {
      return providerCall(() => stripe.accountLinks.create({
        account: input.accountId,
        refresh_url: input.refreshUrl,
        return_url: input.returnUrl,
        type: 'account_onboarding',
      }))
    },
    async retrieveAccount(accountId) {
      const account = await providerCall(() => stripe.accounts.retrieve(accountId))
      if (account.deleted) throw new ConnectServiceError('PROVIDER_ERROR')
      return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements?.currently_due || [],
      }
    },
  }
}
