'use client'

import {
  ChevronLeft, ChevronRight, Plus, Dumbbell, Flame, Zap, Activity, Moon, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
    <div className="section-pad" style={{ width: '100%', maxWidth: '680px', margin: '0 auto', overflowX: 'hidden', paddingBottom: '2rem' }}>

      {/* ── Sticky week nav header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#111827', borderBottom: '1px solid #1F2937', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSection('dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#1A1A1A', border: '1px solid #2A2A2A', cursor: 'pointer', color: '#9CA3AF' }}>
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', color: '#F8FAFC', margin: 0 }}>CALENDRIER</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setCalWeekOffset(0)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#C9A84C', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Aujourd&apos;hui</button>
            <button onClick={() => setShowNewSession(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#000', background: 'linear-gradient(135deg, #C9A84C, #D4AF37)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
              <Plus size={12} strokeWidth={2.5} /> Séance
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCalWeekOffset(o => o - 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#1F2937', border: '1px solid #374151', borderRadius: 10, padding: '9px 12px', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, minHeight: 44 }}
          ><ChevronLeft size={14} /> Précédente</button>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, color: '#9CA3AF', textAlign: 'center', flexShrink: 0, minWidth: 110 }}>
            {format(days[0], 'd', { locale: fr })} – {format(days[6], 'd MMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => setCalWeekOffset(o => o + 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#1F2937', border: '1px solid #374151', borderRadius: 10, padding: '9px 12px', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, minHeight: 44 }}
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
            <div key={i} style={{ borderBottom: i < 6 ? '1px solid #1F2937' : 'none', paddingBottom: 12, marginBottom: 4 }}>
              {/* Day header row */}
              <div className="cal-day-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`cal-day-label${isToday ? ' today' : ''}`}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: isToday ? '#F97316' : '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {DAY_LABELS[i]} {format(day, 'd')}
                    </span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 600, color: isToday ? '#FB923C' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {format(day, 'MMM', { locale: fr })}
                    </span>
                  </div>
                  {daySessions.length > 0 && (
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.12)', borderRadius: 6, padding: '2px 7px' }}>
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
                    const color = SESSION_COLORS[s.session_type] ?? '#F97316'
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
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        {/* Type icon */}
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                          {TYPE_ICONS[s.session_type] ?? <Dumbbell size={15} />}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', letterSpacing: '0.02em' }}>{s.session_type}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={11} color="#6B7280" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{format(dt, 'HH:mm')} – {format(dtEnd, 'HH:mm')}</span>
                          </div>
                        </div>
                        {/* Client + duration */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}25`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.58rem', color, flexShrink: 0 }}>
                              {avatarInitials}
                            </div>
                          </div>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color, background: `${color}15`, borderRadius: 6, padding: '2px 7px' }}>
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
            <div style={{ width: 8, height: 8, borderRadius: 2, background: SESSION_COLORS[t] }} />
            <span style={{ fontSize: '0.7rem', color: '#6B7280', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>{t}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
