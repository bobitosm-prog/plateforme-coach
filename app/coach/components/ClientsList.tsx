'use client'

import { Search } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, GOLD, GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_BODY,
} from '../../../lib/design-tokens'

import { initials, statusFor, STATUS_META } from '../hooks/useCoachDashboard'
import type { ClientRow, ScheduledSession } from '../hooks/useCoachDashboard'
import { useIsMobile } from '../../hooks/useIsMobile'
import ClientCard from './ClientCard'

interface ClientsListProps {
  filtered: ClientRow[]
  loading: boolean
  search: string
  setSearch: (s: string) => void
  showInvite: boolean
  setShowInvite: (v: boolean | ((prev: boolean) => boolean)) => void
  unreadCounts: Record<string, number>
  setSection: (s: 'accueil' | 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
  openChat: (c: ClientRow) => void
  setShowNewSession: (v: boolean) => void
  coachInitials: string
  scheduledSessions: ScheduledSession[]
  clients: ClientRow[]
  SESSION_COLORS: Record<string, string>
  setSelectedSession: (s: ScheduledSession | null) => void
  lastSessionByClient: Map<string, { name: string; completedAt: string }>
  sessionsThisWeekByClient: Map<string, number>
}

export default function ClientsList({
  filtered, loading, search, setSearch,
  showInvite, setShowInvite,
  unreadCounts, setSection, openChat, setShowNewSession,
  coachInitials,
  scheduledSessions, clients, SESSION_COLORS,
  setSelectedSession,
  lastSessionByClient, sessionsThisWeekByClient,
}: ClientsListProps) {
  const isMobile = useIsMobile()
  return (
    <div>

      {/* Header */}
      <div className="sidebar-card">
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '20px', gap: isMobile ? 12 : 0 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Clients</h2>
          <div style={{ position: 'relative', width: isMobile ? '100%' : 280 }}>
            <Search size={15} color={TEXT_DIM} strokeWidth={2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="search" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un client" style={{ width: '100%', padding: '9px 12px 9px 36px', background: BG_BASE, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontFamily: FONT_BODY, fontSize: 13, color: TEXT_PRIMARY, outline: 'none' }} />
          </div>
        </div>

        {/* Client cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 58, background: BORDER, borderRadius: 8, opacity: 0.5 }} />
            ))
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: TEXT_MUTED, padding: '40px 16px', fontSize: '0.875rem', fontFamily: FONT_BODY }}>
              {search ? 'Aucun client trouvé.' : "Aucun client pour l'instant."}
            </p>
          ) : (
            filtered.map(c => {
              const p = c.profiles
              const name = p?.full_name ?? 'Sans nom'
              const ini = initials(p?.full_name)
              const status = statusFor(c.created_at)
              const meta = STATUS_META[status]
              const daysSince = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
              const unread = unreadCounts[c.client_id] || 0
              const isActive = daysSince < 7
              const isWarning = daysSince >= 7 && daysSince < 14
              const statusColor = isActive ? GREEN : isWarning ? GOLD : RED
              const statusLabel = isActive ? 'Actif' : isWarning ? 'Inactif 7j+' : 'Inactif 14j+'
              return (
                <ClientCard
                  key={c.id}
                  name={name}
                  email={p?.email || ''}
                  avatarUrl={p?.avatar_url}
                  initials={ini}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                  sinceLabel={`· Depuis ${daysSince}j`}
                  unread={unread}
                  invited={!!c.invited_by_coach}
                  onOpen={() => { window.location.href = `/client/${c.client_id}` }}
                  onMessage={() => { setSection('messages'); openChat(c) }}
                />
              )
            })
          )}
        </div>

        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>
            {loading ? '…' : `Affichage de ${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

    </div>
  )
}
