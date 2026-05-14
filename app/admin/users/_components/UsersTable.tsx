'use client'
import { useState } from 'react'
import { Search, Settings2 } from 'lucide-react'
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
      <div className="admin-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="admin-search-wrap">
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Rechercher email ou nom..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="admin-input"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => onRoleFilterChange(e.target.value)}
            className="admin-select"
            style={{ minWidth: '180px', width: 'auto' }}
          >
            <option value="">Tous les roles</option>
            <option value="client">Clients</option>
            <option value="coach">Coachs</option>
            <option value="admin">Admins</option>
          </select>

          <div className="admin-label ml-auto tabular-nums">
            {loading ? '…' : `${users.length} compte${users.length > 1 ? 's' : ''}`}
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
                <th style={{ minWidth: '240px' }}>Utilisateur</th>
                <th style={{ minWidth: '90px' }} className="hidden md:table-cell">Role</th>
                <th style={{ minWidth: '130px' }}>Abonnement</th>
                <th style={{ minWidth: '130px' }} className="hidden lg:table-cell">Derniere activite</th>
                <th style={{ minWidth: '70px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="h-5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 16px', color: '#99907e', fontSize: '0.875rem' }}>
                    Aucun compte trouve
                  </td>
                </tr>
              )}

              {users.map(u => (
                <tr key={u.id} className="group/row">
                  <td>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="admin-avatar w-10 h-10 shrink-0" style={{ fontSize: '0.85rem' }}>
                        {(u.full_name || u.email)[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" style={{ color: '#e5e2e1' }}>
                          {u.full_name || u.email.split('@')[0]}
                        </div>
                        <div className="text-xs truncate" style={{ color: '#99907e' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    <StatusBadge variant={roleVariant(u.role)} onClick={() => setRoleDialogUser(u)}>
                      {u.role || '—'}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge variant={subscriptionVariant(u.subscription_type)}>
                        {u.subscription_type || 'aucun'}
                      </StatusBadge>
                      {u.subscription_status && u.subscription_status !== 'active' && (
                        <span className="text-[10px]" style={{ color: '#99907e' }}>{u.subscription_status}</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell text-xs tabular-nums" style={{ color: '#d0c5b2' }}>
                    {formatRelative(u.last_workout_at) || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setSubDialogUser(u)}
                      className="p-2 rounded-lg transition opacity-0 group-hover/row:opacity-100"
                      style={{ color: '#99907e' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#d4a843'; e.currentTarget.style.background = 'rgba(212,168,67,0.1)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#99907e'; e.currentTarget.style.background = 'transparent' }}
                      aria-label="Modifier l'abonnement"
                    >
                      <Settings2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
