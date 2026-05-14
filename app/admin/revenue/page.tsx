'use client'
import { useMemo } from 'react'
import { Coins, TrendingUp, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { KpiCard } from '../_components/KpiCard'
import { PaymentsTable } from './_components/PaymentsTable'
import { usePayments } from './_hooks/usePayments'
import { formatCurrency } from '../_components/formatters'

export default function AdminRevenuePage() {
  const { payments, loading, error, statusFilter, setStatusFilter, periodDays, setPeriodDays } = usePayments()

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

  return (
    <div className="admin-fade-in">
      <PageHeader
        title="Revenue"
        description="Historique des paiements et performance financiere"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Total periode"
          value={loading ? '—' : formatCurrency(recap.total, 'CHF')}
          subtext={`${payments.length} paiement${payments.length > 1 ? 's' : ''} ${periodLabel}`}
          icon={Coins}
          loading={loading}
          accent="emerald"
        />
        <KpiCard
          label="Reussis"
          value={loading ? '—' : formatCurrency(recap.succeededAmount, 'CHF')}
          subtext={`${recap.succeededCount} succes`}
          icon={CheckCircle2}
          loading={loading}
          accent="gold"
        />
        <KpiCard
          label="Taux de succes"
          value={loading ? '—' : payments.length > 0 ? `${Math.round((recap.succeededCount / payments.length) * 100)}%` : '—'}
          subtext={periodLabel}
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
