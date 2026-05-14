'use client'
import { useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../_components/StatusBadge'
import { formatDateTime } from '../../_components/formatters'
import type { AdminLogRow } from '../_hooks/useLogs'

interface Props {
  logs: AdminLogRow[]
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (v: string) => void
  actionFilter: string
  onActionFilterChange: (v: string) => void
}

function actionVariant(action: string | undefined): 'gold' | 'emerald' | 'rose' | 'zinc' {
  switch (action) {
    case 'role_change':         return 'gold'
    case 'subscription_change': return 'emerald'
    case 'user_delete':         return 'rose'
    default:                    return 'zinc'
  }
}

function extractAction(details: Record<string, unknown> | null): string | undefined {
  if (!details) return undefined
  const a = details.action
  return typeof a === 'string' ? a : undefined
}

export function LogsTable({
  logs, loading, error,
  search, onSearchChange,
  actionFilter, onActionFilterChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <>
      <div className="admin-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="admin-search-wrap">
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Rechercher dans les messages..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="admin-input"
            />
          </div>

          <select value={actionFilter} onChange={e => onActionFilterChange(e.target.value)} className="admin-select" style={{ minWidth: '220px', width: 'auto' }}>
            <option value="">Toutes les actions</option>
            <option value="role_change">Changement de role</option>
            <option value="subscription_change">Modification abonnement</option>
            <option value="user_delete">Suppression compte</option>
          </select>

          <div className="admin-label ml-auto tabular-nums">
            {loading ? '…' : `${logs.length} log${logs.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {error && <div className="p-6 text-center text-sm" style={{ color: '#fb7185' }}>{error}</div>}

        {!error && loading && logs.length === 0 && (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}

        {!error && !loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 16px', color: '#99907e', fontSize: '0.875rem' }}>
            Aucune action admin enregistree
          </div>
        )}

        {!error && logs.length > 0 && (
          <ul style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            {logs.map((log, idx) => {
              const action = extractAction(log.details)
              const isOpen = expanded.has(log.id)
              return (
                <li key={log.id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <button
                    type="button"
                    onClick={() => toggle(log.id)}
                    className="w-full flex items-center gap-3 text-left transition"
                    style={{ padding: '14px 20px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span className="shrink-0" style={{ color: '#99907e' }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <StatusBadge variant={actionVariant(action)}>
                      {action || log.level}
                    </StatusBadge>
                    <span className="text-sm truncate flex-1" style={{ color: '#d0c5b2' }}>{log.message}</span>
                    <span className="text-[11px] tabular-nums shrink-0 hidden sm:inline" style={{ color: '#99907e' }}>
                      {formatDateTime(log.created_at)}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 20px 18px 52px' }} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <div><span style={{ color: '#99907e' }}>Acteur :</span> <span style={{ color: '#d0c5b2' }}>{log.user_email || '—'}</span></div>
                        <div><span style={{ color: '#99907e' }}>Quand :</span> <span className="tabular-nums" style={{ color: '#d0c5b2' }}>{formatDateTime(log.created_at)}</span></div>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-[11px] overflow-x-auto font-mono p-3 rounded-lg" style={{
                          color: '#d0c5b2',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(201,168,76,0.08)',
                        }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
