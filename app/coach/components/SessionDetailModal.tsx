'use client'
import { X, Calendar, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, RED, TEXT_PRIMARY, TEXT_MUTED,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT,
} from '../../../lib/design-tokens'
import { SESSION_COLORS, type ScheduledSession } from '../hooks/useCoachDashboard'

export default function SessionDetailModal({ session, clients, onClose, onDelete }: {
  session: ScheduledSession
  clients: any[]
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const clientName = clients.find(c => c.client_id === session.client_id)?.profiles?.full_name ?? 'Client'
  const color = SESSION_COLORS[session.session_type] ?? GOLD
  const dt = new Date(session.scheduled_at)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, width: '100%', maxWidth: 380, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontFamily: FONT_ALT, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color, letterSpacing: '2px' }}>{session.session_type}</span>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.5rem', fontWeight: 700, color: TEXT_PRIMARY, margin: '4px 0 0' }}>{clientName}</h3>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: TEXT_MUTED }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={14} /><span>{format(dt, 'EEEE d MMMM yyyy', { locale: fr })}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={14} /><span>{format(dt, 'HH:mm', { locale: fr })} · {session.duration_minutes} min</span></div>
            {session.location && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /><span>{session.location}</span></div>}
            {session.notes && <div style={{ background: BG_BASE, borderRadius: RADIUS_CARD, padding: '10px 14px', color: TEXT_PRIMARY, marginTop: 4, border: `1px solid ${BORDER}` }}>{session.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => { if (window.confirm('Supprimer ce rendez-vous ?')) onDelete(session.id) }} style={{ flex: 1, background: 'transparent', color: RED, border: `1px solid ${RED}`, borderRadius: 12, padding: '10px', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Supprimer</button>
            <button onClick={onClose} style={{ flex: 1, background: BG_CARD_2, color: TEXT_PRIMARY, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px', fontFamily: FONT_ALT, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
