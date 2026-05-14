import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import {
  listAllActiveSubscriptions,
  computeMrrFromSubscriptions,
  aggregateBalanceTransactions,
} from '@/lib/admin/stripe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    // 1. Stripe subscriptions actives + MRR
    const stripeSubsP = listAllActiveSubscriptions()
      .then(subs => ({
        mrr: computeMrrFromSubscriptions(subs),
        active_count: subs.length,
      }))
      .catch(err => {
        console.error('[stats] subs error:', err)
        return { mrr: { amount: 0, currency: 'chf' }, active_count: 0, error: 'subs_failed' }
      })

    // 2. Stripe balance transactions agregees
    const balanceP = aggregateBalanceTransactions(12)
      .catch(err => {
        console.error('[stats] balance error:', err)
        return null
      })

    // 3. Counts par subscription_type (depuis profiles)
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

    const [stripeData, balance, profilesData] = await Promise.all([
      stripeSubsP, balanceP, profilesP,
    ])

    return NextResponse.json({
      mrr: stripeData.mrr,
      active_subscriptions: stripeData.active_count,
      stripe_error: (stripeData as { error?: string }).error || (balance ? null : 'balance_failed'),

      users: profilesData,

      // Tout en centimes (coherent avec Stripe)
      total_gross: balance?.total_gross || 0,
      total_fee: balance?.total_fee || 0,
      total_net: balance?.total_net || 0,

      last_30d: {
        gross: balance?.last_30d_gross || 0,
        fee: balance?.last_30d_fee || 0,
        net: balance?.last_30d_net || 0,
        count: balance?.last_30d_count || 0,
      },

      revenue_by_month: balance?.by_month || [],
      currency: balance?.currency || 'chf',

      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
