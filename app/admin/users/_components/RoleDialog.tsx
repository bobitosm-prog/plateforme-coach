'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../_components/Modal'
import { adminFetch } from '@/lib/admin/api-client'
import type { AdminUserRow, UserRole } from '@/lib/admin/types'

interface Props {
  user: AdminUserRow | null
  onClose: () => void
  onUpdated: (id: string, patch: Partial<AdminUserRow>) => void
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'client', label: 'Client', description: 'Acces aux fonctionnalites fitness/nutrition de base' },
  { value: 'coach',  label: 'Coach',  description: 'Peut gerer des clients, creer programmes et plans repas' },
  { value: 'admin',  label: 'Admin',  description: 'Acces a la console administrateur' },
]

export function RoleDialog({ user, onClose, onUpdated }: Props) {
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  const currentRole = user.role as UserRole
  const newRole = selected ?? currentRole
  const hasChanges = selected !== null && selected !== currentRole

  const handleSubmit = async () => {
    if (!hasChanges || !selected) return
    setSubmitting(true)
    try {
      await adminFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: selected }),
      })
      onUpdated(user.id, { role: selected })
      toast.success(`Role change : ${currentRole} → ${selected}`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Echec de la mise a jour')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Changer le role"
      description={user.email}
    >
      <div className="space-y-2 mb-6">
        {ROLES.map(r => {
          const isSelected = newRole === r.value
          const isCurrent = currentRole === r.value
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelected(r.value)}
              className={`
                w-full text-left p-4 rounded-xl border transition
                ${isSelected
                  ? 'border-amber-400/40 bg-amber-400/[0.06]'
                  : 'border-amber-900/15 bg-[#1A150E] hover:border-amber-900/30'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-zinc-100">{r.label}</span>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    actuel
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">{r.description}</p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50 transition"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasChanges || submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-400 text-[#0D0B08] hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Mise a jour…' : 'Confirmer'}
        </button>
      </div>
    </Modal>
  )
}
