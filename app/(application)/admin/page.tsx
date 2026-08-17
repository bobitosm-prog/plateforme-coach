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
        <div className="mb-6 p-4 rounded-xl text-sm" style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          color: '#fb7185',
        }}>
          {error}
        </div>
      )}

      {/* Revenue */}
      <div className="admin-section">
        <span className="admin-section-title">Revenue</span>
        <div className="admin-section-divider" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="CA brut" value={loading ? '—' : formatCurrencyFromCents(stats?.total_gross || 0, stats?.currency)} subtext="Cumul depuis le debut" icon={Coins} loading={loading} accent="gold" />
        <KpiCard label="Net apres frais" value={loading ? '—' : formatCurrencyFromCents(stats?.total_net || 0, stats?.currency)} subtext="Ce que vous touchez" icon={CreditCard} loading={loading} accent="emerald" />
        <KpiCard label="Frais Stripe" value={loading ? '—' : formatCurrencyFromCents(stats?.total_fee || 0, stats?.currency)} subtext={`≈ ${feePercentage}% du brut`} icon={TrendingDown} loading={loading} accent="rose" />
        <KpiCard label="MRR" value={loading ? '—' : formatCurrencyFromCents(stats?.mrr.amount || 0, stats?.mrr.currency)} subtext={`${stats?.active_subscriptions || 0} abonne(s) actif(s)`} icon={Zap} loading={loading} accent="gold" />
      </div>

      {/* Chart */}
      <Card
        title="Evolution sur 12 mois"
        description="Brut (or) vs Net apres frais Stripe (vert)"
        className="mb-8"
      >
        <div style={{ padding: '24px 28px 28px' }}>
          <RevenueChart
            data={stats?.revenue_by_month || []}
            loading={loading}
          />
        </div>
      </Card>

      {/* 30 jours */}
      <div className="admin-section">
        <span className="admin-section-title">30 derniers jours</span>
        <div className="admin-section-divider" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Brut 30j" value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.gross || 0, stats?.currency)} subtext={`${stats?.last_30d.count || 0} transaction(s)`} icon={Calendar} loading={loading} accent="gold" />
        <KpiCard label="Net 30j" value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.net || 0, stats?.currency)} subtext="Apres commission" loading={loading} accent="emerald" />
        <KpiCard label="Frais 30j" value={loading ? '—' : formatCurrencyFromCents(stats?.last_30d.fee || 0, stats?.currency)} loading={loading} accent="rose" />
      </div>

      {/* Utilisateurs */}
      <div className="admin-section">
        <span className="admin-section-title">Utilisateurs</span>
        <div className="admin-section-divider" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total comptes" value={loading ? '—' : String(stats?.users.total || 0)} icon={Users} loading={loading} accent="zinc" />
        <KpiCard label="Lifetime" value={loading ? '—' : String(stats?.users.lifetime || 0)} subtext="Acces permanent" icon={Crown} loading={loading} accent="gold" />
        <KpiCard label="Monthly actifs" value={loading ? '—' : String(stats?.users.monthly || 0)} subtext="Abonnement en cours" icon={UserCheck} loading={loading} accent="emerald" />
        <KpiCard label="Invites" value={loading ? '—' : String(stats?.users.invited || 0)} subtext="Pas encore actifs" icon={Mail} loading={loading} accent="zinc" />
      </div>

      {stats?.generated_at && (
        <p className="text-[10px] mt-8 text-right tabular-nums" style={{ color: '#5a5246' }}>
          Donnees generees a {formatDateTime(stats.generated_at)}
        </p>
      )}
    </div>
  )
}
