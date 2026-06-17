'use client'
import { Pencil, Power, PowerOff, Plus, Loader2 } from 'lucide-react'
import { StatusBadge } from '../../_components/StatusBadge'
import type { Campaign } from '../_hooks/useCampaigns'

interface Props {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  onToggle: (id: string, isActive: boolean) => void
  onEdit: (campaign: Campaign) => void
  onNew: () => void
}

export function CampaignsTable({ campaigns, loading, error, onToggle, onEdit, onNew }: Props) {
  return (
    <>
      {/* Toolbar */}
      <div className="admin-card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between">
          <div className="admin-label tabular-nums">
            {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: 'rgba(212,168,67,0.12)',
              color: '#d4a843',
              border: '1px solid rgba(212,168,67,0.2)',
            }}
          >
            <Plus size={14} />
            Nouvelle campagne
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        {error && (
          <div className="px-4 py-3 text-sm" style={{ color: '#fb7185' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: '#d4a843' }} />
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Duree</th>
                <th>Places</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const slotsLeft = c.max_slots - c.used_slots
                const pct = c.max_slots > 0 ? Math.round((c.used_slots / c.max_slots) * 100) : 0
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="text-zinc-100 font-medium">{c.name}</span>
                    </td>
                    <td>
                      <span className="tabular-nums" style={{ color: '#d0c5b2' }}>{c.free_days}j</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums" style={{ color: '#d0c5b2' }}>
                          {c.used_slots}/{c.max_slots}
                        </span>
                        <div
                          style={{
                            width: 48,
                            height: 4,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 2,
                              background: slotsLeft <= 0 ? '#fb7185' : '#d4a843',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums" style={{ color: '#99907e' }}>
                          {slotsLeft > 0 ? `${slotsLeft} dispo` : 'complet'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge variant={c.is_active ? 'emerald' : 'zinc'}>
                        {c.is_active ? 'Actif' : 'Inactif'}
                      </StatusBadge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onToggle(c.id, !c.is_active)}
                          className="p-1.5 rounded-lg transition hover:bg-white/5"
                          style={{ color: c.is_active ? '#fb7185' : '#5eead4' }}
                          title={c.is_active ? 'Desactiver' : 'Activer'}
                        >
                          {c.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                        </button>
                        <button
                          onClick={() => onEdit(c)}
                          className="p-1.5 rounded-lg transition hover:bg-white/5"
                          style={{ color: '#d0c5b2' }}
                          title="Editer"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: '#99907e' }}>
            Aucune campagne. Cree-en une pour lancer la beta.
          </div>
        )}
      </div>
    </>
  )
}
