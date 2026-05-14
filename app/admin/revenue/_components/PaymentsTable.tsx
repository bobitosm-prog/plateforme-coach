'use client'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { StatusBadge } from '../../_components/StatusBadge'
import { formatCurrencyFromMajor, formatDateTime } from '../../_components/formatters'
import type { AdminPaymentRow } from '../_hooks/usePayments'

interface Props {
  payments: AdminPaymentRow[]
  loading: boolean
  error: string | null
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  periodDays: number
  onPeriodChange: (v: number) => void
}

const PERIODS = [
  { value: 30,  label: '30 jours' },
  { value: 90,  label: '90 jours' },
  { value: 180, label: '6 mois' },
  { value: 365, label: '12 mois' },
  { value: 0,   label: 'Tout' },
]

function paymentStatusVariant(s: string): 'gold' | 'emerald' | 'rose' | 'amber' | 'zinc' {
  switch (s) {
    case 'succeeded':
    case 'paid':       return 'emerald'
    case 'failed':     return 'rose'
    case 'pending':
    case 'processing': return 'amber'
    case 'refunded':   return 'zinc'
    default:           return 'zinc'
  }
}

export function PaymentsTable({
  payments, loading, error,
  statusFilter, onStatusFilterChange,
  periodDays, onPeriodChange,
}: Props) {
  const selectClass = 'appearance-none bg-[#1A150E] border border-amber-900/20 rounded-lg pl-3 pr-9 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/40 transition cursor-pointer'

  return (
    <>
      {/* Toolbar */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl mb-4 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select value={periodDays} onChange={e => onPeriodChange(parseInt(e.target.value, 10))} className={selectClass}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} className={selectClass}>
            <option value="">Tous statuts</option>
            <option value="succeeded">Reussis</option>
            <option value="paid">Payes</option>
            <option value="pending">En attente</option>
            <option value="failed">Echoues</option>
            <option value="refunded">Rembourses</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        <div className="text-xs text-zinc-500 ml-auto tabular-nums">
          {loading ? '…' : `${payments.length} paiement${payments.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl overflow-hidden">
        {error && <div className="p-6 text-center text-rose-300 text-sm">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-900/10 text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-3 py-3">Client</th>
                  <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">Coach</th>
                  <th className="text-right font-medium px-3 py-3">Montant</th>
                  <th className="text-left font-medium px-3 py-3">Statut</th>
                  <th className="text-right font-medium px-5 py-3 hidden md:table-cell">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {loading && payments.length === 0 && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-amber-900/5">
                        <td colSpan={6} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && payments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-zinc-500 text-sm">Aucun paiement sur cette periode</td></tr>
                )}

                {payments.map(p => (
                  <tr key={p.id} className="border-b border-amber-900/5 hover:bg-white/[0.015] transition">
                    <td className="px-5 py-4 text-xs text-zinc-400 tabular-nums">
                      {formatDateTime(p.paid_at || p.created_at)}
                    </td>
                    <td className="px-3 py-4">
                      {p.client ? (
                        <div className="min-w-0">
                          <div className="text-zinc-100 text-sm truncate">{p.client.full_name || p.client.email.split('@')[0]}</div>
                          <div className="text-[11px] text-zinc-500 truncate">{p.client.email}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 hidden lg:table-cell">
                      {p.coach ? (
                        <div className="text-zinc-300 text-xs truncate">{p.coach.full_name || p.coach.email.split('@')[0]}</div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums text-zinc-100 font-medium">
                      {formatCurrencyFromMajor(Number(p.amount), p.currency || 'CHF')}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge variant={paymentStatusVariant(p.status)}>
                        {p.status}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4 text-right hidden md:table-cell">
                      {p.stripe_checkout_session_id ? (
                        <a
                          href={`https://dashboard.stripe.com/payments/${p.stripe_checkout_session_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition"
                          title="Voir dans Stripe"
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
