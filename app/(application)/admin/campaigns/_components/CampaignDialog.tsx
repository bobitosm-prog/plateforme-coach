'use client'
import { useState, useEffect } from 'react'
import { Modal } from '../../_components/Modal'
import type { Campaign } from '../_hooks/useCampaigns'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  campaign: Campaign | null
  onClose: () => void
  onSubmit: (values: { name: string; free_days: number; max_slots: number }) => Promise<void>
}

export function CampaignDialog({ open, mode, campaign, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [freeDays, setFreeDays] = useState(60)
  const [maxSlots, setMaxSlots] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open && mode === 'edit' && campaign) {
      setName(campaign.name)
      setFreeDays(campaign.free_days)
      setMaxSlots(campaign.max_slots)
    } else if (open && mode === 'create') {
      setName('')
      setFreeDays(60)
      setMaxSlots(20)
    }
    setErr(null)
  }, [open, mode, campaign])

  const usedSlots = campaign?.used_slots ?? 0

  const validate = (): string | null => {
    if (!name.trim()) return 'Le nom est requis'
    if (name.trim().length > 120) return 'Le nom ne doit pas depasser 120 caracteres'
    if (!Number.isInteger(freeDays) || freeDays < 1 || freeDays > 365) return 'Duree : 1-365 jours'
    if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 10000) return 'Places : 1-10000'
    if (mode === 'edit' && maxSlots < usedSlots) return `Places min = ${usedSlots} (deja reclamees)`
    return null
  }

  const handleSubmit = async () => {
    const validationErr = validate()
    if (validationErr) { setErr(validationErr); return }
    setSubmitting(true)
    setErr(null)
    try {
      await onSubmit({ name: name.trim(), free_days: freeDays, max_slots: maxSlots })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = 'w-full bg-[#1A150E] border border-amber-900/20 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400/40 transition'
  const labelClass = 'block text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nouvelle campagne' : 'Editer la campagne'}
      description={mode === 'edit' && campaign ? campaign.name : undefined}
    >
      <div className="space-y-4 mb-6">
        <div>
          <label className={labelClass}>Nom</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Beta Geneve Juin 2026"
            className={fieldClass}
            maxLength={120}
          />
        </div>

        <div>
          <label className={labelClass}>Duree (jours gratuits)</label>
          <input
            type="number"
            value={freeDays}
            onChange={e => setFreeDays(parseInt(e.target.value) || 0)}
            min={1}
            max={365}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Places max</label>
          <input
            type="number"
            value={maxSlots}
            onChange={e => setMaxSlots(parseInt(e.target.value) || 0)}
            min={1}
            max={10000}
            className={fieldClass}
          />
          {mode === 'edit' && (
            <p className="text-[10px] mt-1" style={{ color: '#99907e' }}>
              {usedSlots} place{usedSlots !== 1 ? 's' : ''} deja reclamee{usedSlots !== 1 ? 's' : ''} (minimum)
            </p>
          )}
        </div>

        {err && (
          <p className="text-sm" style={{ color: '#fb7185' }}>{err}</p>
        )}
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
          {submitting ? 'En cours…' : mode === 'create' ? 'Creer' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  )
}
