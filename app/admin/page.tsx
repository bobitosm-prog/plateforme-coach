'use client'
import { useEffect, useState } from 'react'
import { Users, Zap, Calendar, Coins, Crown, CreditCard, UserCheck, Mail } from 'lucide-react'
import { adminFetch } from '@/lib/admin/api-client'
import { PageHeader } from './_components/PageHeader'
import { KpiCard } from './_components/KpiCard'
import { Card } from './_components/Card'
import { formatCurrencyFromCents, formatCurrencyFromMajor, formatDateTime } from './_components/formatters'

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

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y.slice(2)}`
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
    <div className="admin-fade-in">
      <PageHeader
        title="Overview"
        description="État de la plateforme MoovX en temps réel"
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

      {/* Section : Revenue */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-semibold">
            Revenue
          </h2>
          <div className="flex-1 h-px bg-amber-900/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="MRR"
            value={loading ? '—' : formatCurrencyFromCents(stats?.mrr.amount || 0, stats?.mrr.currency)}
            subtext="Récurrent mensuel"
            icon={Zap}
            loading={loading}
            accent="gold"
          />
          <KpiCard
            label="CA total"
            value={loading ? '—' : formatCurrencyFromMajor(stats?.total_revenue.amount || 0, stats?.total_revenue.currency)}
            subtext="Cumul plateforme"
            icon={Coins}
            loading={loading}
            accent="emerald"
          />
          <KpiCard
            label="30 derniers jours"
            value={loading ? '—' : formatCurrencyFromMajor(stats?.last_30d.amount || 0, 'CHF')}
            subtext={`${stats?.last_30d.count || 0} paiement${(stats?.last_30d.count || 0) > 1 ? 's' : ''}`}
            icon={Calendar}
            loading={loading}
            accent="zinc"
          />
          <KpiCard
            label="Abonnés actifs"
            value={loading ? '—' : String(stats?.active_subscriptions || 0)}
            subtext="Stripe live"
            icon={CreditCard}
            loading={loading}
            accent="gold"
          />
        </div>
      </section>

      {/* Section : Utilisateurs */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-semibold">
            Utilisateurs
          </h2>
          <div className="flex-1 h-px bg-amber-900/10" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            subtext="Accès permanent"
            icon={Crown}
            loading={loading}
            accent="gold"
          />
          <KpiCard
            label="Monthly actifs"
            value={loading ? '—' : String(stats?.users.monthly || 0)}
            subtext="Abonnement en cours"
            icon={UserCheck}
            loading={loading}
            accent="emerald"
          />
          <KpiCard
            label="Invités"
            value={loading ? '—' : String(stats?.users.invited || 0)}
            subtext="Pas encore actifs"
            icon={Mail}
            loading={loading}
            accent="zinc"
          />
        </div>
      </section>

      {/* Section : Revenue par mois */}
      <section>
        <Card
          title="Revenue mensuel"
          description="12 derniers mois (table payments)"
        >
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : !stats?.revenue_by_month || stats.revenue_by_month.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-12">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="space-y-3">
                {stats.revenue_by_month.slice().reverse().map((m) => {
                  const max = Math.max(...stats.revenue_by_month.map(x => x.amount))
                  const pct = max > 0 ? (m.amount / max) * 100 : 0
                  return (
                    <div key={m.month} className="flex items-center gap-4 group/row">
                      <div className="text-xs text-zinc-500 w-20 font-mono shrink-0">
                        {formatMonth(m.month)}
                      </div>
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500/80 to-amber-400 rounded-full transition-all duration-500 ease-out group-hover/row:from-amber-400 group-hover/row:to-amber-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-zinc-200 w-28 text-right font-mono tabular-nums">
                        {formatCurrencyFromMajor(m.amount, 'CHF')}
                      </div>
                      <div className="text-[11px] text-zinc-500 w-10 text-right tabular-nums shrink-0">
                        {m.count}x
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </section>

      {stats?.generated_at && (
        <p className="text-[10px] text-zinc-600 mt-8 text-right tabular-nums">
          Données générées à {formatDateTime(stats.generated_at)}
        </p>
      )}
    </div>
  )
}
