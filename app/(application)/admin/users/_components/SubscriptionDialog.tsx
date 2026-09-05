'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '../../_components/Modal'
import { adminFetch } from '@/lib/admin/api-client'
import type {
  AdminUserRow,
  SubscriptionStatus,
  WritableSubscriptionType,
} from '@/lib/admin/types'

interface Props {
  user: AdminUserRow | null
  onClose: () => void
  onUpdated: (id: string, patch: Partial<AdminUserRow>) => void
}

const TYPES: { value: WritableSubscriptionType; label: string }[] = [
  { value: null,             label: 'Aucun' },
  { value: 'client_monthly', label: 'Mensuel (CHF 30)' },
  { value: 'lifetime',       label: 'Lifetime' },
  { value: 'trial',          label: 'Essai' },
]

function toWritableSubscriptionType(
  value: AdminUserRow['subscription_type'] | undefined,
): WritableSubscriptionType {
  return TYPES.find(option => option.value === value)?.value ?? null
}

const STATUSES: { value: SubscriptionStatus; label: string }[] = [
  { value: null,        label: 'Aucun' },
  { value: 'active',    label: 'Active' },
  { value: 'trialing',  label: 'En essai' },
  { value: 'past_due',  label: 'Impaye' },
  { value: 'canceled',  label: 'Annule' },
  { value: 'inactive',  label: 'Inactif' },
]

export function SubscriptionDialog({ user, onClose, onUpdated }: Props) {
  const [type, setType] = useState<WritableSubscriptionType>(
    toWritableSubscriptionType(user?.subscription_type),
  )
  const [status, setStatus] = useState<SubscriptionStatus>(user?.subscription_status ?? null)
  const [endDate, setEndDate] = useState<string>(
    user?.subscription_end_date ? user.subscription_end_date.slice(0, 10) : ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [grantingLegacyAccess, setGrantingLegacyAccess] = useState(false)

  if (!user) return null
  const hasHistoricalSubscriptionType = (
    user.subscription_type !== null
    && toWritableSubscriptionType(user.subscription_type) === null
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        subscription_type: type,
        subscription_status: status,
      }
      if (endDate) {
        body.subscription_end_date = new Date(endDate + 'T00:00:00Z').toISOString()
      } else {
        body.subscription_end_date = null
      }

      await adminFetch(`/api/admin/users/${user.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      onUpdated(user.id, {
        subscription_type: type,
        subscription_status: status,
        subscription_end_date: body.subscription_end_date as string | null,
      })
      toast.success('Abonnement mis a jour')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Echec de la mise a jour')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrantLegacyAccess = async () => {
    setGrantingLegacyAccess(true)
    try {
      const result = await adminFetch<{ outcome: 'created' | 'already_exists' }>(
        `/api/admin/users/${user.id}/entitlements/legacy-invited`,
        { method: 'POST' },
      )
      toast.success(
        result.outcome === 'created'
          ? 'Accès legacy accordé'
          : 'Un entitlement legacy existe déjà',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'attribution")
    } finally {
      setGrantingLegacyAccess(false)
    }
  }

  const fieldClass = 'w-full bg-[#1A150E] border border-amber-900/20 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/40 transition'
  const labelClass = 'block text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5'

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="Modifier l'abonnement"
      description={user.email}
    >
      <div className="space-y-4 mb-6">
        {hasHistoricalSubscriptionType && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            Ce profil conserve son accès historique. Modifier l&apos;abonnement ne
            migre ni ne supprime automatiquement cet accès.
          </p>
        )}
        <div>
          <label className={labelClass}>Abonnement commercial</label>
          <select
            value={type ?? ''}
            onChange={e => setType((e.target.value || null) as WritableSubscriptionType)}
            className={fieldClass}
          >
            {TYPES.map(t => (
              <option key={String(t.value)} value={t.value ?? ''}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Statut</label>
          <select
            value={status ?? ''}
            onChange={e => setStatus((e.target.value || null) as SubscriptionStatus)}
            className={fieldClass}
          >
            {STATUSES.map(s => (
              <option key={String(s.value)} value={s.value ?? ''}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Date de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={fieldClass}
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            Laisser vide pour les comptes lifetime ou sans date de fin.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 p-3">
          <p className={labelClass}>Entitlement legacy</p>
          <p className="mb-3 text-xs text-zinc-500">
            Accorde uniquement les capacités produit historiques. Aucune
            relation coach/client n&apos;est créée ou modifiée.
          </p>
          <button
            type="button"
            onClick={handleGrantLegacyAccess}
            disabled={grantingLegacyAccess}
            className="w-full rounded-lg border border-amber-400/30 px-3 py-2 text-sm text-amber-300 transition hover:bg-amber-400/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {grantingLegacyAccess ? 'Attribution…' : 'Accorder accès legacy'}
          </button>
        </div>
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
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-400 text-[#0D0B08] hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Mise a jour…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  )
}
