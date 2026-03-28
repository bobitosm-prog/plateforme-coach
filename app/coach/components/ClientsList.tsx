'use client'

import {
  Search, ChevronRight, UserPlus, Dumbbell, Calendar,
  Copy, Check, MessageCircle, Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  setSection: (s: 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
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
    <div className="lg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

      {/* Client table */}
      <div className="sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className="section-title">Clients</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#6B7280" strokeWidth={2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="search" className="search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un client" />
          </div>
        </div>

        <div className="client-table-wrap" style={{ overflowX: 'auto', borderRadius: '8px', background: '#111827' }}>
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
                  <tr key={i}><td colSpan={6}><div style={{ height: '20px', background: '#374151', borderRadius: '4px', opacity: 0.5 }} /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: '40px 16px' }}>
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
                          <span style={{ fontWeight: 500 }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#9CA3AF' }} onClick={() => window.location.href = `/client/${c.client_id}`}>{since}</td>
                      <td onClick={() => window.location.href = `/client/${c.client_id}`}>{p?.current_weight ? `${p.current_weight} kg` : '—'}</td>
                      <td onClick={() => window.location.href = `/client/${c.client_id}`}><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                      <td>
                        <button
                          onClick={() => { setSection('messages'); openChat(c) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: unread > 0 ? '#EF4444' : '#6B7280', padding: '4px 8px', borderRadius: 6 }}
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
              <div key={i} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 14, height: 74, opacity: 0.5 }} />
            ))
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0', fontSize: '0.875rem' }}>
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
                        <MessageCircle size={20} color={unread > 0 ? '#EF4444' : '#6B7280'} />
                        {unread > 0 && <span className="msg-badge">{unread > 9 ? '9+' : unread}</span>}
                      </button>
                      <ChevronRight size={18} color="#4B5563" />
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
            {loading ? '…' : `Affichage de ${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Quick actions */}
        <div className="sidebar-card">
          <h2 className="section-title">Actions rapides</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <button className="btn-primary" onClick={() => setShowInvite((v: boolean) => !v)} aria-label="Inviter un nouveau client">
              <UserPlus size={16} strokeWidth={2.5} />
              Nouveau client
            </button>

            {showInvite && (
              <div className="invite-panel">
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '10px', lineHeight: 1.5 }}>
                  Partage ce lien — le client sera lié à ton profil automatiquement.
                </p>
                <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '8px 10px', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '10px' }}>
                  {inviteLink || 'Chargement…'}
                </div>
                <button className="btn-primary btn-primary-orange" onClick={copyInviteLink} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                  {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
                </button>
              </div>
            )}

            <button className="btn-primary btn-primary-orange" onClick={() => setShowNewSession(true)}>
              <Dumbbell size={16} strokeWidth={2.5} />
              Nouvelle séance
            </button>

            <hr className="divider" />

            <button className="btn-secondary" onClick={() => setSection('calendar')}>
              <Calendar size={16} strokeWidth={2} />
              Voir le calendrier
            </button>

          </div>
        </div>

        {/* Today */}
        <div className="sidebar-card">
          <h2 className="section-title">Aujourd&apos;hui</h2>
          {(() => {
            const _todayStr = new Date().toISOString().split('T')[0]
            const todaySessions = scheduledSessions.filter(s => s.scheduled_at.startsWith(_todayStr))
            if (todaySessions.length === 0) {
              return <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Aucune séance planifiée.</p>
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todaySessions.map(s => {
                  const color = SESSION_COLORS[s.session_type] ?? '#F97316'
                  const clientName = clients.find(c => c.client_id === s.client_id)?.profiles?.full_name ?? 'Client'
                  const dt = new Date(s.scheduled_at)
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      style={{ background: `${color}18`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '8px 10px', cursor: 'pointer' }}
                    >
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.session_type}</div>
                      <div style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 500, marginTop: 2 }}>{clientName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />{format(dt, 'HH:mm')} · {s.duration_minutes}min
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

      </div>
    </div>
  )
}
