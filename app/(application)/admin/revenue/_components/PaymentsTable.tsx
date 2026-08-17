'use client'
import { ExternalLink } from 'lucide-react'
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
    case 'succeeded': case 'paid':       return 'emerald'
    case 'failed':                       return 'rose'
    case 'pending': case 'processing':   return 'amber'
    case 'refunded':                     return 'zinc'
    default:                             return 'zinc'
  }
}

export function PaymentsTable({
  payments, loading, error,
  statusFilter, onStatusFilterChange,
  periodDays, onPeriodChange,
}: Props) {
  return (
    <>
      {/* Toolbar */}
      <div className="admin-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={periodDays} onChange={e => onPeriodChange(parseInt(e.target.value, 10))} className="admin-select" style={{ minWidth: '160px', width: 'auto' }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} className="admin-select" style={{ minWidth: '180px', width: 'auto' }}>
            <option value="">Tous statuts</option>
            <option value="succeeded">Reussis</option>
            <option value="paid">Payes</option>
            <option value="pending">En attente</option>
            <option value="failed">Echoues</option>
            <option value="refunded">Rembourses</option>
          </select>

          <div className="admin-label ml-auto tabular-nums">
            {loading ? '…' : `${payments.length} paiement${payments.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        {error && <div className="p-6 text-center text-sm" style={{ color: '#fb7185' }}>{error}</div>}

        {!error && (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>Date</th>
                <th style={{ minWidth: '180px' }}>Client</th>
                <th style={{ minWidth: '140px' }} className="hidden lg:table-cell">Coach</th>
                <th style={{ minWidth: '90px', textAlign: 'right' }}>Montant</th>
                <th style={{ minWidth: '100px' }}>Statut</th>
                <th style={{ minWidth: '60px', textAlign: 'right' }} className="hidden md:table-cell">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {loading && payments.length === 0 && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <div className="h-5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#99907e', fontSize: '0.875rem' }}>
                    Aucun paiement sur cette periode
                  </td>
                </tr>
              )}

              {payments.map(p => (
                <tr key={p.id}>
                  <td className="text-xs tabular-nums" style={{ color: '#d0c5b2' }}>
                    {formatDateTime(p.paid_at || p.created_at)}
                  </td>
                  <td>
                    {p.client ? (
                      <div className="min-w-0">
                        <div className="text-sm truncate" style={{ color: '#e5e2e1' }}>{p.client.full_name || p.client.email.split('@')[0]}</div>
                        <div className="text-[11px] truncate" style={{ color: '#99907e' }}>{p.client.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#5a5246' }}>—</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell">
                    {p.coach ? (
                      <div className="text-xs truncate" style={{ color: '#d0c5b2' }}>{p.coach.full_name || p.coach.email.split('@')[0]}</div>
                    ) : (
                      <span className="text-xs" style={{ color: '#5a5246' }}>—</span>
                    )}
                  </td>
                  <td className="tabular-nums font-medium" style={{ color: '#e5e2e1', textAlign: 'right' }}>
                    {formatCurrencyFromMajor(Number(p.amount), p.currency || 'CHF')}
                  </td>
                  <td>
                    <StatusBadge variant={paymentStatusVariant(p.status)}>
                      {p.status}
                    </StatusBadge>
                  </td>
                  <td className="hidden md:table-cell" style={{ textAlign: 'right' }}>
                    {p.stripe_checkout_session_id ? (
                      <a
                        href={`https://dashboard.stripe.com/payments/${p.stripe_checkout_session_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs transition"
                        style={{ color: '#99907e' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#d4a843' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#99907e' }}
                        title="Voir dans Stripe"
                      >
                        <ExternalLink size={12} />
                      </a>
                    ) : <span style={{ color: '#5a5246' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
