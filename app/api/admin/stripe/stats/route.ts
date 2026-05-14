import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import {
  listAllActiveSubscriptions,
  computeMrrFromSubscriptions
} from '@/lib/admin/stripe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/stripe/stats
 *
 * Retourne :
 *  - mrr (live depuis Stripe)
 *  - total_revenue (cumulé depuis table payments)
 *  - active_subscriptions (count Stripe)
 *  - lifetime_users / monthly_users / trial_users (depuis profiles)
 *  - revenue_by_month (12 derniers mois, depuis payments)
 *  - last_30d (count + total depuis payments)
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    // 1. Stripe — subscriptions actives + MRR (parallèle avec le reste)
    const stripeP = listAllActiveSubscriptions()
      .then(subs => ({
        mrr: computeMrrFromSubscriptions(subs),
        active_count: subs.length,
      }))
      .catch(err => {
        console.error('[admin/stripe/stats] Stripe error:', err)
        return {
          mrr: { amount: 0, currency: 'chf' },
          active_count: 0,
          error: 'stripe_unavailable',
        }
      })

    // 2. Counts par subscription_type (depuis profiles)
    const profilesP = (async () => {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('subscription_type, subscription_status')

      if (error || !data) {
        return { lifetime: 0, monthly: 0, trial: 0, invited: 0, total: 0 }
      }

      let lifetime = 0, monthly = 0, trial = 0, invited = 0
      for (const p of data) {
        switch (p.subscription_type) {
          case 'lifetime': lifetime++; break
          case 'client_monthly':
            if (p.subscription_status === 'active') monthly++
            break
          case 'trial': trial++; break
          case 'invited': invited++; break
        }
      }
      return { lifetime, monthly, trial, invited, total: data.length }
    })()

    // 3. Payments — total cumulé + 30 derniers jours + breakdown mensuel
    const paymentsP = (async () => {
      const since = new Date()
      since.setMonth(since.getMonth() - 12)
      const since30d = new Date()
      since30d.setDate(since30d.getDate() - 30)

      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('amount, currency, status, paid_at, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      if (error || !data) {
        return {
          total_revenue: { amount: 0, currency: 'chf' },
          last_30d: { amount: 0, count: 0 },
          revenue_by_month: [],
        }
      }

      // Cumul + breakdown mensuel
      const byMonth = new Map<string, { amount: number; count: number }>()
      let last30Amount = 0, last30Count = 0
      let totalAmount = 0

      for (const p of data) {
        if (p.status !== 'succeeded' && p.status !== 'paid') continue
        const amt = Number(p.amount) || 0
        const date = new Date(p.paid_at || p.created_at)

        totalAmount += amt

        const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        const cur = byMonth.get(monthKey) || { amount: 0, count: 0 }
        cur.amount += amt
        cur.count += 1
        byMonth.set(monthKey, cur)

        if (date >= since30d) {
          last30Amount += amt
          last30Count += 1
        }
      }

      // Trier par mois ascendant
      const revenue_by_month = Array.from(byMonth.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        total_revenue: { amount: totalAmount, currency: 'chf' },
        last_30d: { amount: last30Amount, count: last30Count },
        revenue_by_month,
      }
    })()

    const [stripeData, profilesData, paymentsData] = await Promise.all([
      stripeP, profilesP, paymentsP,
    ])

    return NextResponse.json({
      mrr: stripeData.mrr,
      active_subscriptions: stripeData.active_count,
      stripe_error: (stripeData as { error?: string }).error || null,

      users: profilesData,

      total_revenue: paymentsData.total_revenue,
      last_30d: paymentsData.last_30d,
      revenue_by_month: paymentsData.revenue_by_month,

      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
