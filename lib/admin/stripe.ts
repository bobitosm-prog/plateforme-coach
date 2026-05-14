import 'server-only'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquante dans .env')
}

/**
 * Client Stripe singleton server-side.
 * ⚠️ En local, sk_live_ → tape la VRAIE prod Stripe.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

/**
 * Calcule le MRR (en centimes, devise principale) à partir d'une liste
 * de subscriptions Stripe ACTIVES.
 *
 * Convertit toutes les intervales en équivalent mensuel :
 *  - month  : amount / interval_count
 *  - year   : amount / 12
 *  - week   : amount * 4.33
 *  - day    : amount * 30
 *
 * Hypothèse : 1 currency dominante (CHF). Si mix, on additionne en
 * naïf (à raffiner plus tard).
 */
export function computeMrrFromSubscriptions(
  subscriptions: Stripe.Subscription[]
): { amount: number; currency: string } {
  let totalCents = 0
  let currency = 'chf'

  for (const sub of subscriptions) {
    if (sub.status !== 'active' && sub.status !== 'trialing') continue

    for (const item of sub.items.data) {
      const price = item.price
      if (!price.unit_amount || !price.recurring) continue

      const qty = item.quantity || 1
      const base = price.unit_amount * qty
      const intervalCount = price.recurring.interval_count || 1

      let monthly = 0
      switch (price.recurring.interval) {
        case 'month':
          monthly = base / intervalCount
          break
        case 'year':
          monthly = base / (12 * intervalCount)
          break
        case 'week':
          monthly = base * (4.33 / intervalCount)
          break
        case 'day':
          monthly = base * (30 / intervalCount)
          break
      }

      totalCents += monthly
      if (price.currency) currency = price.currency
    }
  }

  return { amount: Math.round(totalCents), currency }
}

/**
 * Liste TOUTES les subscriptions actives Stripe en paginant.
 * Hard cap à 1000 pour éviter abus.
 */
export async function listAllActiveSubscriptions(): Promise<Stripe.Subscription[]> {
  const all: Stripe.Subscription[] = []
  let starting_after: string | undefined
  let safety = 0

  while (safety < 10) {
    safety++
    const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    })
    all.push(...page.data)
    if (!page.has_more || page.data.length === 0) break
    starting_after = page.data[page.data.length - 1].id
  }

  return all
}
