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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectClass = 'appearance-none bg-[#1A150E] border border-amber-900/20 rounded-lg pl-3 pr-9 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/40 transition cursor-pointer'

  return (
    <>
      {/* Toolbar */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl mb-4 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher dans les messages…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-[#1A150E] border border-amber-900/20 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 transition"
          />
        </div>

        <div className="relative">
          <select value={actionFilter} onChange={e => onActionFilterChange(e.target.value)} className={selectClass}>
            <option value="">Toutes les actions</option>
            <option value="role_change">Changement de role</option>
            <option value="subscription_change">Modification abonnement</option>
            <option value="user_delete">Suppression compte</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>

        <div className="text-xs text-zinc-500 ml-auto tabular-nums">
          {loading ? '…' : `${logs.length} log${logs.length > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl overflow-hidden">
        {error && <div className="p-6 text-center text-rose-300 text-sm">{error}</div>}

        {!error && loading && logs.length === 0 && (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!error && !loading && logs.length === 0 && (
          <div className="p-12 text-center text-zinc-500 text-sm">
            Aucune action admin enregistree
          </div>
        )}

        {!error && logs.length > 0 && (
          <ul className="divide-y divide-amber-900/5">
            {logs.map(log => {
              const action = extractAction(log.details)
              const isOpen = expanded.has(log.id)
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => toggle(log.id)}
                    className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition text-left"
                  >
                    <span className="text-zinc-500 shrink-0">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <StatusBadge variant={actionVariant(action)}>
                      {action || log.level}
                    </StatusBadge>
                    <span className="text-sm text-zinc-200 truncate flex-1">{log.message}</span>
                    <span className="text-[11px] text-zinc-500 tabular-nums shrink-0 hidden sm:inline">
                      {formatDateTime(log.created_at)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pl-12 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <div><span className="text-zinc-500">Acteur :</span> <span className="text-zinc-300">{log.user_email || '—'}</span></div>
                        <div><span className="text-zinc-500">Quand :</span> <span className="text-zinc-300 tabular-nums">{formatDateTime(log.created_at)}</span></div>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-[11px] text-zinc-400 bg-black/30 border border-amber-900/10 rounded-lg p-3 overflow-x-auto font-mono">
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
