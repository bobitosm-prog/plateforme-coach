'use client'
import { useEffect, useState } from 'react'
import { Users, DollarSign, Zap, Calendar, Coins, Crown } from 'lucide-react'
import { adminFetch } from '@/lib/admin/api-client'
import { PageHeader } from './_components/PageHeader'
import { KpiCard } from './_components/KpiCard'
import { Card } from './_components/Card'
import { formatCurrency, formatDateTime } from './_components/formatters'

interface StatsResponse {
  mrr: { amount: number; currency: string }
  active_subscriptions: number
  stripe_error: string | null
  users: { lifetime: number; monthly: number; trial: number; invited: number; total: number }
  total_revenue: { amount: number; currency: string }
  last_30d: { amount: number; count: number }
  revenue_by_month: { month: string; amount: number; count: number }[]
  generated_at: string
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch<StatsResponse>('/api/admin/stripe/stats')
        setStats(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <>
      <PageHeader
        title="Overview"
        description="Vue d'ensemble de la plateforme MoovX"
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {stats?.stripe_error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          Données Stripe indisponibles : {stats.stripe_error}
        </div>
      )}

      {/* KPIs revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="MRR"
          value={loading ? '—' : formatCurrency(stats?.mrr.amount || 0, stats?.mrr.currency)}
          subtext="Revenue récurrent mensuel"
          icon={Zap}
          loading={loading}
          accent="gold"
        />
        <KpiCard
          label="CA total"
          value={loading ? '—' : formatCurrency(stats?.total_revenue.amount || 0, stats?.total_revenue.currency)}
          subtext="Cumul depuis le début"
          icon={Coins}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          label="30 derniers jours"
          value={loading ? '—' : formatCurrency(stats?.last_30d.amount || 0, 'CHF')}
          subtext={`${stats?.last_30d.count || 0} paiement${(stats?.last_30d.count || 0) > 1 ? 's' : ''}`}
          icon={Calendar}
          loading={loading}
          accent="zinc"
        />
        <KpiCard
          label="Abonnements actifs"
          value={loading ? '—' : String(stats?.active_subscriptions || 0)}
          subtext="Stripe live"
          icon={DollarSign}
          loading={loading}
          accent="gold"
        />
      </div>

      {/* KPIs users */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total comptes"
          value={loading ? '—' : String(stats?.users.total || 0)}
          icon={Users}
          loading={loading}
          accent="zinc"
        />
        <KpiCard
          label="Lifetime"
          value={loading ? '—' : String(stats?.users.lifetime || 0)}
          icon={Crown}
          loading={loading}
          accent="gold"
        />
        <KpiCard
          label="Monthly actifs"
          value={loading ? '—' : String(stats?.users.monthly || 0)}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          label="Invités"
          value={loading ? '—' : String(stats?.users.invited || 0)}
          loading={loading}
          accent="zinc"
        />
      </div>

      {/* Mini breakdown mensuel */}
      <Card title="Revenue par mois" description="12 derniers mois (table payments)">
        <div className="p-6">
          {loading ? (
            <div className="h-32 bg-white/5 rounded animate-pulse" />
          ) : !stats?.revenue_by_month || stats.revenue_by_month.length === 0 ? (
            <div className="text-zinc-500 text-sm text-center py-8">
              Aucune donnée disponible
            </div>
          ) : (
            <div className="space-y-2">
              {stats.revenue_by_month.slice().reverse().map((m) => {
                const max = Math.max(...stats.revenue_by_month.map(x => x.amount))
                const pct = max > 0 ? (m.amount / max) * 100 : 0
                return (
                  <div key={m.month} className="flex items-center gap-4">
                    <div className="text-xs text-zinc-500 w-16 font-mono">{m.month}</div>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-300 w-24 text-right font-mono">
                      {formatCurrency(m.amount, 'CHF')}
                    </div>
                    <div className="text-xs text-zinc-500 w-12 text-right">
                      {m.count}x
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {stats?.generated_at && (
        <p className="text-[10px] text-zinc-600 mt-6 text-right">
          Données générées à {formatDateTime(stats.generated_at)}
        </p>
      )}
    </>
  )
}
