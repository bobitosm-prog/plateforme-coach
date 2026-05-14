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

export interface BalanceMonthSummary {
  month: string
  gross: number
  fee: number
  net: number
  count: number
}

export interface BalanceAggregate {
  total_gross: number
  total_fee: number
  total_net: number
  last_30d_gross: number
  last_30d_fee: number
  last_30d_net: number
  last_30d_count: number
  by_month: BalanceMonthSummary[]
  currency: string
}

/**
 * Recupere les balance_transactions de type 'charge' sur N mois,
 * agrege par mois + 30j + total. Tous les montants en centimes.
 */
export async function aggregateBalanceTransactions(months = 12): Promise<BalanceAggregate> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const sinceTs = Math.floor(since.getTime() / 1000)

  const since30d = new Date()
  since30d.setDate(since30d.getDate() - 30)
  const since30dTs = Math.floor(since30d.getTime() / 1000)

  let starting_after: string | undefined
  let safety = 0

  const byMonth = new Map<string, BalanceMonthSummary>()
  let total_gross = 0, total_fee = 0, total_net = 0
  let last_30d_gross = 0, last_30d_fee = 0, last_30d_net = 0, last_30d_count = 0
  let currency = 'chf'

  while (safety < 10) {
    safety++
    const page = await stripe.balanceTransactions.list({
      type: 'charge',
      created: { gte: sinceTs },
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    })

    for (const tx of page.data) {
      const gross = tx.amount
      const fee = tx.fee
      const net = tx.net
      const date = new Date(tx.created * 1000)

      total_gross += gross
      total_fee += fee
      total_net += net
      if (tx.currency) currency = tx.currency

      if (tx.created >= since30dTs) {
        last_30d_gross += gross
        last_30d_fee += fee
        last_30d_net += net
        last_30d_count += 1
      }

      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      const cur = byMonth.get(monthKey) || { month: monthKey, gross: 0, fee: 0, net: 0, count: 0 }
      cur.gross += gross
      cur.fee += fee
      cur.net += net
      cur.count += 1
      byMonth.set(monthKey, cur)
    }

    if (!page.has_more || page.data.length === 0) break
    starting_after = page.data[page.data.length - 1].id
  }

  // Garantir 12 mois consecutifs (zeros pour mois vides)
  const sortedMonths: BalanceMonthSummary[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    sortedMonths.push(byMonth.get(key) || { month: key, gross: 0, fee: 0, net: 0, count: 0 })
  }

  return {
    total_gross, total_fee, total_net,
    last_30d_gross, last_30d_fee, last_30d_net, last_30d_count,
    by_month: sortedMonths,
    currency,
  }
}
