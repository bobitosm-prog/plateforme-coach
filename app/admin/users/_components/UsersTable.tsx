'use client'
import { useState } from 'react'
import { Search, ChevronDown, Settings2 } from 'lucide-react'
import type { AdminUserRow } from '@/lib/admin/types'
import { StatusBadge, roleVariant, subscriptionVariant } from '../../_components/StatusBadge'
import { formatRelative } from '../../_components/formatters'
import { RoleDialog } from './RoleDialog'
import { SubscriptionDialog } from './SubscriptionDialog'

interface Props {
  users: AdminUserRow[]
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (v: string) => void
  roleFilter: string
  onRoleFilterChange: (v: string) => void
  onUserUpdated: (id: string, patch: Partial<AdminUserRow>) => void
}

export function UsersTable({
  users, loading, error,
  search, onSearchChange,
  roleFilter, onRoleFilterChange,
  onUserUpdated,
}: Props) {
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUserRow | null>(null)
  const [subDialogUser, setSubDialogUser] = useState<AdminUserRow | null>(null)

  return (
    <>
      {/* Toolbar */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher email ou nom…"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-[#1A150E] border border-amber-900/20 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 transition"
            />
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => onRoleFilterChange(e.target.value)}
              className="appearance-none bg-[#1A150E] border border-amber-900/20 rounded-lg pl-3 pr-9 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/40 transition cursor-pointer"
            >
              <option value="">Tous les roles</option>
              <option value="client">Clients</option>
              <option value="coach">Coachs</option>
              <option value="admin">Admins</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          <div className="text-xs text-zinc-500 ml-auto tabular-nums">
            {loading ? '…' : `${users.length} compte${users.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#15110B] border border-amber-900/15 rounded-2xl overflow-hidden">
        {error && (
          <div className="p-6 text-center text-rose-300 text-sm">
            {error}
          </div>
        )}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-900/10 text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="text-left font-medium px-5 py-3">Utilisateur</th>
                  <th className="text-left font-medium px-3 py-3 hidden md:table-cell">Role</th>
                  <th className="text-left font-medium px-3 py-3">Abonnement</th>
                  <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">Derniere activite</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-amber-900/5">
                        <td className="px-5 py-4"><div className="h-4 w-48 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-3 py-4"><div className="h-5 w-14 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-3 py-4"><div className="h-5 w-20 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-3 py-4"><div className="h-4 w-24 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-5 py-4"><div className="h-7 w-7 bg-white/5 rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">
                      Aucun compte trouve
                    </td>
                  </tr>
                )}

                {users.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-amber-900/5 hover:bg-white/[0.015] transition group/row"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-amber-400/10 ring-1 ring-amber-400/15 flex items-center justify-center text-xs font-semibold text-amber-300">
                          {(u.full_name || u.email)[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-zinc-100 font-medium truncate">
                            {u.full_name || u.email.split('@')[0]}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 hidden md:table-cell">
                      <StatusBadge
                        variant={roleVariant(u.role)}
                        onClick={() => setRoleDialogUser(u)}
                      >
                        {u.role || '—'}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge variant={subscriptionVariant(u.subscription_type)}>
                          {u.subscription_type || 'aucun'}
                        </StatusBadge>
                        {u.subscription_status && u.subscription_status !== 'active' && (
                          <span className="text-[10px] text-zinc-500">{u.subscription_status}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 hidden lg:table-cell text-zinc-400 text-xs tabular-nums">
                      {formatRelative(u.last_workout_at) || '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSubDialogUser(u)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 transition opacity-0 group-hover/row:opacity-100"
                        aria-label="Modifier l'abonnement"
                      >
                        <Settings2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RoleDialog
        user={roleDialogUser}
        onClose={() => setRoleDialogUser(null)}
        onUpdated={onUserUpdated}
      />
      <SubscriptionDialog
        user={subDialogUser}
        onClose={() => setSubDialogUser(null)}
        onUpdated={onUserUpdated}
      />
    </>
  )
}
