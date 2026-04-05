'use client'

import {
  ChevronLeft, ChevronRight, Plus, Dumbbell, Flame, Zap, Activity, Moon, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

import { SESSION_COLORS, SESSION_TYPES } from '../hooks/useCoachDashboard'
import type { ClientRow, ScheduledSession } from '../hooks/useCoachDashboard'

function getWeekDays(offsetWeeks = 0): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

interface CoachCalendarProps {
  calWeekOffset: number
  setCalWeekOffset: (v: number | ((prev: number) => number)) => void
  scheduledSessions: ScheduledSession[]
  clients: ClientRow[]
  setSelectedSession: (s: ScheduledSession | null) => void
  setShowNewSession: (v: boolean) => void
  setNsDate: (v: string) => void
  setSection: (s: 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
}

export default function CoachCalendar({
  calWeekOffset, setCalWeekOffset,
  scheduledSessions, clients,
  setSelectedSession, setShowNewSession, setNsDate,
  setSection,
}: CoachCalendarProps) {
  const days = getWeekDays(calWeekOffset)
  const todayStr = new Date().toISOString().split('T')[0]
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    Force: <Dumbbell size={15} />, Cardio: <Flame size={15} />,
    HIIT: <Zap size={15} />, Mobilité: <Activity size={15} />, Récupération: <Moon size={15} />,
  }

  return (
    <div className="section-pad" style={{ width: '100%', maxWidth: 680, margin: '0 auto', overflowX: 'hidden', paddingBottom: '2rem' }}>

      {/* ── Sticky week nav header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: BG_BASE, borderBottom: `1px solid ${BORDER}`, padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSection('dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 12, background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', color: TEXT_MUTED }}>
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '3px', color: TEXT_PRIMARY, margin: 0, textTransform: 'uppercase' }}>CALENDRIER</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setCalWeekOffset(0)} style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12, padding: '5px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Aujourd&apos;hui</button>
            <button onClick={() => setShowNewSession(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, color: BG_BASE, background: GOLD, border: 'none', borderRadius: 12, padding: '5px 12px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
              <Plus size={12} strokeWidth={2.5} /> Séance
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCalWeekOffset(o => o - 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, minHeight: 44, letterSpacing: '1px' }}
          ><ChevronLeft size={14} /> Précédente</button>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, color: TEXT_MUTED, textAlign: 'center', flexShrink: 0, minWidth: 110, letterSpacing: '1px' }}>
            {format(days[0], 'd', { locale: fr })} – {format(days[6], 'd MMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => setCalWeekOffset(o => o + 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, minHeight: 44, letterSpacing: '1px' }}
          >Suivante <ChevronRight size={14} /></button>
        </div>
      </div>

      {/* ── Day list ── */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column' }}>
        {days.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0]
          const isToday = dateStr === todayStr
          const daySessions = scheduledSessions
            .filter(s => s.scheduled_at.startsWith(dateStr))
            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
          return (
            <div key={i} style={{ borderBottom: i < 6 ? `1px solid ${BORDER}` : 'none', paddingBottom: 12, marginBottom: 4 }}>
              {/* Day header row */}
              <div className="cal-day-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`cal-day-label${isToday ? ' today' : ''}`}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '1.1rem', color: isToday ? GOLD : TEXT_PRIMARY, textTransform: 'uppercase', letterSpacing: '2px' }}>
                      {DAY_LABELS[i]} {format(day, 'd')}
                    </span>
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.7rem', fontWeight: 600, color: isToday ? GOLD : TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                      {format(day, 'MMM', { locale: fr })}
                    </span>
                  </div>
                  {daySessions.length > 0 && (
                    <span style={{ fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '2px 7px', letterSpacing: '1px' }}>
                      {daySessions.length}
                    </span>
                  )}
                </div>
                <button
                  className="cal-add-day"
                  onClick={() => { setNsDate(dateStr); setShowNewSession(true) }}
                ><Plus size={11} /> Ajouter</button>
              </div>

              {/* Sessions or empty state */}
              {daySessions.length === 0 ? (
                <div className="cal-empty">Aucune séance</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {daySessions.map(s => {
                    const color = SESSION_COLORS[s.session_type] ?? GOLD
                    const client = clients.find(c => c.client_id === s.client_id)
                    const clientName = client?.profiles?.full_name ?? 'Client'
                    const avatarInitials = clientName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                    const dt = new Date(s.scheduled_at)
                    const dtEnd = new Date(dt.getTime() + s.duration_minutes * 60000)
                    return (
                      <div
                        key={s.id}
                        className="cal-session-card"
                        onClick={() => setSelectedSession(s)}
                        style={{ borderLeft: `2px solid ${GOLD}` }}
                      >
                        {/* Type icon */}
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, flexShrink: 0 }}>
                          {TYPE_ICONS[s.session_type] ?? <Dumbbell size={15} />}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT_ALT, fontWeight: 700, fontSize: '1rem', color: TEXT_PRIMARY, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{s.session_type}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={11} color={TEXT_MUTED} />
                            <span style={{ fontFamily: FONT_BODY, fontSize: '0.75rem', color: TEXT_MUTED }}>{format(dt, 'HH:mm')} – {format(dtEnd, 'HH:mm')}</span>
                          </div>
                        </div>
                        {/* Client + duration */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontFamily: FONT_BODY, fontSize: '0.72rem', color: TEXT_MUTED, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '0.58rem', color: GOLD, flexShrink: 0 }}>
                              {avatarInitials}
                            </div>
                          </div>
                          <span style={{ fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, borderRadius: 12, padding: '2px 7px', letterSpacing: '0.5px' }}>
                            {s.duration_minutes}min
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px', flexWrap: 'wrap' }}>
        {SESSION_TYPES.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 12, background: SESSION_COLORS[t] }} />
            <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, fontFamily: FONT_ALT, fontWeight: 600, letterSpacing: '1px' }}>{t}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
