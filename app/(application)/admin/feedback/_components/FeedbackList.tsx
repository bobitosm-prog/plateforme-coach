'use client'
import { useState } from 'react'
import { Search, Bug, Lightbulb, HelpCircle, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../_components/StatusBadge'
import { formatRelative } from '../../_components/formatters'
import { FeedbackDetailDialog } from './FeedbackDetailDialog'
import type { AdminBugReportRow } from '@/lib/admin/types'

interface Props {
  reports: AdminBugReportRow[]
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (v: string) => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  onReportUpdated: (id: string, patch: Partial<AdminBugReportRow>) => void
}

function typeIcon(type: string) {
  switch (type) {
    case 'bug':          return Bug
    case 'amelioration': return Lightbulb
    default:             return HelpCircle
  }
}

function typeVariant(type: string): 'rose' | 'gold' | 'zinc' {
  switch (type) {
    case 'bug':          return 'rose'
    case 'amelioration': return 'gold'
    default:             return 'zinc'
  }
}

function statusVariant(status: string | null): 'rose' | 'amber' | 'emerald' | 'zinc' {
  switch (status) {
    case 'nouveau':  return 'rose'
    case 'en_cours': return 'amber'
    case 'resolu':   return 'emerald'
    case 'rejete':   return 'zinc'
    default:         return 'rose'
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'nouveau':  return 'nouveau'
    case 'en_cours': return 'en cours'
    case 'resolu':   return 'resolu'
    case 'rejete':   return 'ignore'
    default:         return 'nouveau'
  }
}

export function FeedbackList({
  reports, loading, error,
  search, onSearchChange,
  typeFilter, onTypeFilterChange,
  statusFilter, onStatusFilterChange,
  onReportUpdated,
}: Props) {
  const [openReport, setOpenReport] = useState<AdminBugReportRow | null>(null)

  return (
    <>
      {/* Toolbar */}
      <div className="admin-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="admin-search-wrap">
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Rechercher titre ou description..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="admin-input"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value)}
            className="admin-select"
            style={{ minWidth: '180px', width: 'auto' }}
          >
            <option value="">Tous types</option>
            <option value="bug">Bugs</option>
            <option value="amelioration">Ameliorations</option>
            <option value="autre">Autres</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="admin-select"
            style={{ minWidth: '180px', width: 'auto' }}
          >
            <option value="unresolved">A traiter</option>
            <option value="">Tous statuts</option>
            <option value="nouveau">Nouveaux</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Resolus</option>
            <option value="rejete">Ignores</option>
          </select>

          <div className="admin-label ml-auto tabular-nums">
            {loading ? '…' : `${reports.length} rapport${reports.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="admin-card overflow-hidden">
        {error && <div className="p-6 text-center text-sm" style={{ color: '#fb7185' }}>{error}</div>}

        {!error && loading && reports.length === 0 && (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}

        {!error && !loading && reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 16px', color: '#99907e', fontSize: '0.875rem' }}>
            Aucun rapport correspondant
          </div>
        )}

        {!error && reports.length > 0 && (
          <ul>
            {reports.map((r, idx) => {
              const Icon = typeIcon(r.type)
              return (
                <li
                  key={r.id}
                  style={{
                    borderBottom: idx < reports.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenReport(r)}
                    className="w-full text-left transition flex items-start gap-4"
                    style={{ padding: '16px 20px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Icon type */}
                    <div
                      className="shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: r.type === 'bug' ? 'rgba(244,63,94,0.08)'
                                  : r.type === 'amelioration' ? 'rgba(212,168,67,0.08)'
                                  : 'rgba(208,197,178,0.06)',
                        border: '1px solid ' + (r.type === 'bug' ? 'rgba(244,63,94,0.18)'
                                              : r.type === 'amelioration' ? 'rgba(212,168,67,0.18)'
                                              : 'rgba(208,197,178,0.15)'),
                      }}
                    >
                      <Icon size={15} strokeWidth={1.8} style={{
                        color: r.type === 'bug' ? '#fb7185'
                              : r.type === 'amelioration' ? '#d4a843'
                              : '#d0c5b2'
                      }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: '#e5e2e1' }}>
                          {r.title}
                        </span>
                        <StatusBadge variant={typeVariant(r.type)}>
                          {r.type}
                        </StatusBadge>
                        <StatusBadge variant={statusVariant(r.status as string | null)}>
                          {statusLabel(r.status as string | null)}
                        </StatusBadge>
                        {r.priority && (
                          <StatusBadge variant={r.priority === 'critique' ? 'rose' : r.priority === 'haute' ? 'amber' : 'zinc'}>
                            P · {r.priority}
                          </StatusBadge>
                        )}
                        {r.admin_reply && (
                          <StatusBadge variant="emerald">
                            ✓ repondu
                          </StatusBadge>
                        )}
                      </div>
                      <div className="text-xs truncate mb-1" style={{ color: '#99907e' }}>
                        {r.description}
                      </div>
                      <div className="text-[11px] flex items-center gap-3" style={{ color: '#5a5246' }}>
                        <span>{r.user_email || 'anonyme'}</span>
                        <span>·</span>
                        <span className="tabular-nums">{formatRelative(r.created_at)}</span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 mt-3" style={{ color: '#5a5246' }}>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <FeedbackDetailDialog
        report={openReport}
        onClose={() => setOpenReport(null)}
        onUpdated={(id, patch) => {
          onReportUpdated(id, patch)
          if (openReport && openReport.id === id) {
            setOpenReport({ ...openReport, ...patch })
          }
        }}
      />
    </>
  )
}
