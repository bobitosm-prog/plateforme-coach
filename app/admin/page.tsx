'use client'
import { useEffect, useState } from 'react'
import { Users, Zap, Calendar, Coins, Crown, CreditCard, UserCheck, Mail, TrendingDown } from 'lucide-react'
import { adminFetch } from '@/lib/admin/api-client'
import { PageHeader } from './_components/PageHeader'
import { KpiCard } from './_components/KpiCard'
import { Card } from './_components/Card'
import { RevenueChart } from './_components/RevenueChart'
import { formatCurrencyFromCents, formatDateTime } from './_components/formatters'

interface StatsResponse {
  mrr: { amount: number; currency: string }
  active_subscriptions: number
  stripe_error: string | null
  users: { lifetime: number; monthly: number; trial: number; invited: number; total: number }
  total_gross: number
  total_fee: number
  total_net: number
  last_30d: { gross: number; fee: number; net: number; count: number }
  revenue_by_month: { month: string; gross: number; fee: number; net: number; count: number }[]
  currency: string
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

  const feePercentage = stats && stats.total_gross > 0
    ? ((stats.total_fee / stats.total_gross) * 100).toFixed(1)
    : '0'

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Overview"
        description="Etat de la plateforme MoovX en temps reel"
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {stats?.stripe_error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          Donnees Stripe partielles : {stats.stripe_error}
        </div>
      )}

      {/* Section Revenue */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-semibold">
            Revenue
          </h2>
          <div className="flex-1 h-px bg-amber-900/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="CA brut"
            value={loading ? '—' : formatCurrencyFromCents(stats?.total_gross || 0, stats?.currency)}
            subtext="Cumul depuis le debut"
            icon={Coins}
            loading={loading}
            accent="gold"
          />
          <KpiCard
            label="Net apres frais"
            value={loading ? '—' : formatCurrencyFromCents(stats?.total_net || 0, stats?.currency)}
            subtext="Ce que vous touchez reellement"
            icon={CreditCard}
            loading={loading}
            accent="emerald"
          />
          <KpiCard
            label="Frais Stripe"
            value={loading ? '—' : formatCurrencyFromCents(stats?.total_fee || 0, stats?.currency)}
            subtext={`≈ ${feePercentage}% du brut`}
            icon={TrendingDown}
            loading={loading}
            accent="rose"
          />
          <KpiCard
            label="MRR"
            value={loading ? '—' : formatCurrencyFromCents(stats?.mrr.amount || 0, stats?.mrr.currency)}
            subtext={`${stats?.active_subscriptions || 0} abonne(s) actif(s)`}
            icon={Zap}
            loading={loading}
            accent="gold"
          />
        </div>

        {/* Graphique evolution */}
        <Card
          title="Evolution sur 12 mois"
          description="Brut (or) vs Net apres frais Stripe (vert)"
        >
          <div className="p-6">
            <RevenueChart
              data={stats?.revenue_by_month || []}
              loading={loading}
            />
          </div>
        </Card>
      </section>

      {/* Section 30 derniers jours */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-semibold">
            30 derniers jours
          </h2>
          <div className="flex-1 h-px bg-amber-900/10" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Brut 30j"
            value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.gross || 0, stats?.currency)}
            subtext={`${stats?.last_30d.count || 0} transaction(s)`}
            icon={Calendar}
            loading={loading}
            accent="gold"
          />
          <KpiCard
            label="Net 30j"
            value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.net || 0, stats?.currency)}
            subtext="Apres commission Stripe"
            loading={loading}
            accent="emerald"
          />
          <KpiCard
            label="Frais 30j"
            value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.fee || 0, stats?.currency)}
            loading={loading}
            accent="rose"
          />
        </div>
      </section>

      {/* Section Utilisateurs */}
      <section>
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
            subtext="Acces permanent"
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
            label="Invites"
            value={loading ? '—' : String(stats?.users.invited || 0)}
            subtext="Pas encore actifs"
            icon={Mail}
            loading={loading}
            accent="zinc"
          />
        </div>
      </section>

      {stats?.generated_at && (
        <p className="text-[10px] text-zinc-600 mt-8 text-right tabular-nums">
          Donnees generees a {formatDateTime(stats.generated_at)}
        </p>
      )}
    </div>
  )
}
