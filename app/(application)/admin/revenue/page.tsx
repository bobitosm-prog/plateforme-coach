'use client'
import { useEffect, useMemo, useState } from 'react'
import { Coins, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react'
import { adminFetch } from '@/lib/admin/api-client'
import { PageHeader } from '../_components/PageHeader'
import { KpiCard } from '../_components/KpiCard'
import { PaymentsTable } from './_components/PaymentsTable'
import { usePayments } from './_hooks/usePayments'
import { formatCurrencyFromMajor, formatCurrencyFromCents } from '../_components/formatters'

interface StatsResponse {
  total_gross: number; total_fee: number; total_net: number
  last_30d: { gross: number; fee: number; net: number; count: number }
  currency: string
}

export default function AdminRevenuePage() {
  const { payments, loading, error, statusFilter, setStatusFilter, periodDays, setPeriodDays } = usePayments()
  const [stats, setStats] = useState<StatsResponse | null>(null)

  useEffect(() => {
    adminFetch<StatsResponse>('/api/admin/stripe/stats')
      .then(setStats)
      .catch(() => {})
  }, [])

  const recap = useMemo(() => {
    let total = 0
    let succeededAmount = 0
    let succeededCount = 0
    for (const p of payments) {
      const amt = Number(p.amount) || 0
      total += amt
      if (p.status === 'succeeded' || p.status === 'paid') {
        succeededAmount += amt
        succeededCount += 1
      }
    }
    return { total, succeededAmount, succeededCount }
  }, [payments])

  const periodLabel = periodDays === 0 ? 'depuis le debut' : `${periodDays}j`
  const successRate = !loading && payments.length > 0
    ? Math.round((recap.succeededCount / payments.length) * 100)
    : 0

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Revenue"
        description="Historique des paiements et performance financiere"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Brut periode"
          value={loading ? '—' : formatCurrencyFromMajor(recap.total, 'CHF')}
          subtext={`${payments.length} paiement(s) ${periodLabel}`}
          icon={Coins}
          loading={loading}
          accent="gold"
        />
        <KpiCard
          label="Net cumule"
          value={stats ? formatCurrencyFromCents(stats.total_net, stats.currency) : '—'}
          subtext="Apres commission Stripe"
          icon={CheckCircle2}
          loading={!stats}
          accent="emerald"
        />
        <KpiCard
          label="Frais Stripe (total)"
          value={stats ? formatCurrencyFromCents(stats.total_fee, stats.currency) : '—'}
          subtext="Tous mois confondus"
          icon={TrendingDown}
          loading={!stats}
          accent="rose"
        />
        <KpiCard
          label="Taux de succes"
          value={loading ? '—' : `${successRate}%`}
          subtext={`${recap.succeededCount}/${payments.length}`}
          icon={TrendingUp}
          loading={loading}
          accent="zinc"
        />
      </div>

      <PaymentsTable
        payments={payments}
        loading={loading}
        error={error}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        periodDays={periodDays}
        onPeriodChange={setPeriodDays}
      />
    </div>
  )
}
