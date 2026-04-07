'use client'

import {
  Search, ChevronRight, UserPlus,
  Copy, Check, MessageCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

import { initials, statusFor, STATUS_META } from '../hooks/useCoachDashboard'
import type { ClientRow, ScheduledSession } from '../hooks/useCoachDashboard'

interface ClientsListProps {
  filtered: ClientRow[]
  loading: boolean
  search: string
  setSearch: (s: string) => void
  showInvite: boolean
  setShowInvite: (v: boolean | ((prev: boolean) => boolean)) => void
  inviteLink: string
  copied: boolean
  copyInviteLink: () => void
  unreadCounts: Record<string, number>
  setSection: (s: 'accueil' | 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
  openChat: (c: ClientRow) => void
  setShowNewSession: (v: boolean) => void
  coachInitials: string
  scheduledSessions: ScheduledSession[]
  clients: ClientRow[]
  SESSION_COLORS: Record<string, string>
  setSelectedSession: (s: ScheduledSession | null) => void
}

export default function ClientsList({
  filtered, loading, search, setSearch,
  showInvite, setShowInvite, inviteLink, copied, copyInviteLink,
  unreadCounts, setSection, openChat, setShowNewSession,
  coachInitials,
  scheduledSessions, clients, SESSION_COLORS,
  setSelectedSession,
}: ClientsListProps) {
  return (
    <div>

      {/* Client table */}
      <div className="sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className="section-title">Clients</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={TEXT_MUTED} strokeWidth={2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="search" className="search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un client" />
          </div>
        </div>

        <div className="client-table-wrap" style={{ overflowX: 'auto', borderRadius: RADIUS_CARD, background: BG_CARD }}>
          <table className="data-table" aria-label="Liste des clients">
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Membre depuis</th>
                <th scope="col">Poids</th>
                <th scope="col">Statut</th>
                <th scope="col">Messages</th>
                <th scope="col"><span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div style={{ height: '20px', background: BORDER, borderRadius: RADIUS_CARD, opacity: 0.5 }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: TEXT_MUTED, padding: '40px 16px' }}>
                  {search ? 'Aucun client trouvé.' : "Aucun client pour l'instant."}
                </td></tr>
              ) : (
                filtered.map(c => {
                  const p = c.profiles
                  const name = p?.full_name ?? 'Sans nom'
                  const ini = initials(p?.full_name)
                  const status = statusFor(c.created_at)
                  const meta = STATUS_META[status]
                  const since = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                  const unread = unreadCounts[c.client_id] || 0
                  return (
                    <tr key={c.id} tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/client/${c.client_id}` }}
                      aria-label={`Voir le profil de ${name}`}>
                      <td onClick={() => window.location.href = `/client/${c.client_id}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p?.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            : <div className="avatar-circle">{ini}</div>
                          }
                          <span style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ color: TEXT_MUTED }} onClick={() => window.location.href = `/client/${c.client_id}`}>{since}</td>
                      <td onClick={() => window.location.href = `/client/${c.client_id}`}>{p?.current_weight ? `${p.current_weight} kg` : '—'}</td>
                      <td onClick={() => window.location.href = `/client/${c.client_id}`}><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                      <td>
                        <button
                          onClick={() => { setSection('messages'); openChat(c) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: unread > 0 ? RED : TEXT_MUTED, padding: '4px 8px', borderRadius: 12 }}
                        >
                          <MessageCircle size={15} />
                          {unread > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{unread}</span>}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                          onClick={e => { e.stopPropagation(); window.location.href = `/client/${c.client_id}` }}
                          aria-label={`Ouvrir le profil de ${name}`}>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CLIENT CARDS ── */}
        <div className="client-cards-m">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, height: 74, opacity: 0.5 }} />
            ))
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: TEXT_MUTED, padding: '32px 0', fontSize: '0.875rem', fontFamily: FONT_BODY }}>
              {search ? 'Aucun client trouvé.' : "Aucun client pour l'instant."}
            </p>
          ) : (
            filtered.map((c, i) => {
              const p = c.profiles
              const name = p?.full_name ?? 'Sans nom'
              const ini = initials(p?.full_name)
              const status = statusFor(c.created_at)
              const meta = STATUS_META[status]
              const since = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              const unread = unreadCounts[c.client_id] || 0
              return (
                <motion.div
                  key={c.id}
                  className="client-card-m"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.055, duration: 0.28, ease: 'easeOut' }}
                  onClick={() => window.location.href = `/client/${c.client_id}`}
                >
                  <div className="client-card-m-inner">
                    {p?.avatar_url
                      ? <img src={p.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div className="avatar-circle-lg">{ini}</div>
                    }
                    <div className="client-card-info">
                      <div className="client-card-name">{name}</div>
                      <div style={{ marginTop: 4 }}><span className={`badge ${meta.cls}`}>{meta.label}</span></div>
                      <div className="client-card-sub">
                        {p?.current_weight ? `${p.current_weight} kg · ` : ''}Membre depuis {since}
                      </div>
                    </div>
                    <div className="client-card-actions">
                      <button
                        className="client-card-msg-btn"
                        onClick={e => { e.stopPropagation(); setSection('messages'); openChat(c) }}
                        aria-label="Messages"
                      >
                        <MessageCircle size={20} color={unread > 0 ? RED : TEXT_MUTED} />
                        {unread > 0 && <span className="msg-badge">{unread > 9 ? '9+' : unread}</span>}
                      </button>
                      <ChevronRight size={18} color={TEXT_DIM} />
                    </div>
                  </div>
                </motion.div>
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
