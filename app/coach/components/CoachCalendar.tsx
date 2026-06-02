'use client'

import { useState } from 'react'
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
import { useIsMobile } from '../../hooks/useIsMobile'

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

function getMonthGrid(monthOffset = 0): { date: Date; inMonth: boolean }[] {
  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const firstDow = base.getDay()
  const startDiff = firstDow === 0 ? -6 : 1 - firstDow
  const start = new Date(base)
  start.setDate(base.getDate() + startDiff)
  start.setHours(0, 0, 0, 0)
  const month = base.getMonth()
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    return { date: d, inMonth: d.getMonth() === month }
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
  setSection: (s: 'accueil' | 'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil') => void
}

export default function CoachCalendar({
  calWeekOffset, setCalWeekOffset,
  scheduledSessions, clients,
  setSelectedSession, setShowNewSession, setNsDate,
  setSection,
}: CoachCalendarProps) {
  const isMobile = useIsMobile()
  const [calView, setCalView] = useState<'week' | 'month'>('week')
  const [calMonthOffset, setCalMonthOffset] = useState(0)
  const days = getWeekDays(calWeekOffset)
  const todayStr = new Date().toISOString().split('T')[0]
  const monthGrid = getMonthGrid(calMonthOffset)
  const monthLabel = new Date(new Date().getFullYear(), new Date().getMonth() + calMonthOffset, 1)
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    Force: <Dumbbell size={15} />, Cardio: <Flame size={15} />,
    HIIT: <Zap size={15} />, Mobilité: <Activity size={15} />, Récupération: <Moon size={15} />,
  }

  return (
    <div className="section-pad" style={{ width: '100%', overflowX: 'hidden', paddingBottom: '2rem' }}>

      {/* ── Sticky week nav header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: BG_BASE, borderBottom: `1px solid ${BORDER}`, padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSection('dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 12, background: BG_CARD, border: `1px solid ${BORDER}`, cursor: 'pointer', color: TEXT_MUTED }}>
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 700, letterSpacing: '3px', color: TEXT_PRIMARY, margin: 0, textTransform: 'uppercase' }}>CALENDRIER</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ display: 'flex', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setCalView('week')} style={{ fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: 'none', letterSpacing: '0.5px', textTransform: 'uppercase' as const, background: calView === 'week' ? GOLD : 'transparent', color: calView === 'week' ? BG_BASE : TEXT_MUTED }}>Semaine</button>
              <button onClick={() => setCalView('month')} style={{ fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, padding: '5px 10px', cursor: 'pointer', border: 'none', letterSpacing: '0.5px', textTransform: 'uppercase' as const, background: calView === 'month' ? GOLD : 'transparent', color: calView === 'month' ? BG_BASE : TEXT_MUTED }}>Mois</button>
            </div>
            <button onClick={() => { setCalWeekOffset(0); setCalMonthOffset(0) }} style={{ fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, color: GOLD, background: GOLD_DIM, border: `1px solid ${GOLD_RULE}`, borderRadius: 12, padding: '5px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Aujourd&apos;hui</button>
            <button onClick={() => setShowNewSession(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_ALT, fontSize: '0.72rem', fontWeight: 700, color: BG_BASE, background: GOLD, border: 'none', borderRadius: 12, padding: '5px 12px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
              <Plus size={12} strokeWidth={2.5} /> Séance
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => calView === 'week' ? setCalWeekOffset(o => o - 1) : setCalMonthOffset(o => o - 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, minHeight: 44, letterSpacing: '1px' }}
          ><ChevronLeft size={14} />{!isMobile && ' Précédente'}</button>
          <span style={{ fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, color: TEXT_MUTED, textAlign: 'center', flexShrink: 0, minWidth: 110, letterSpacing: '1px' }}>
            {calView === 'week'
              ? `${format(days[0], 'd', { locale: fr })} – ${format(days[6], 'd MMM yyyy', { locale: fr })}`
              : format(monthLabel, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            onClick={() => calView === 'week' ? setCalWeekOffset(o => o + 1) : setCalMonthOffset(o => o + 1)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', color: TEXT_MUTED, cursor: 'pointer', fontFamily: FONT_ALT, fontSize: '0.82rem', fontWeight: 600, minHeight: 44, letterSpacing: '1px' }}
          >{!isMobile && 'Suivante '}<ChevronRight size={14} /></button>
        </div>
      </div>

      {/* ── Vue semaine ── */}
      {calView === 'week' && (isMobile ? (
        /* MOBILE : cartes par jour empilées */
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {days.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const daySessions = scheduledSessions.filter(s => s.scheduled_at.startsWith(dateStr)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
            return (
              <div key={i} style={{ background: BG_CARD, border: `1px solid ${isToday ? GOLD_RULE : BORDER}`, borderRadius: RADIUS_CARD, padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', minWidth: 40, flexShrink: 0 }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', fontWeight: 700, color: isToday ? GOLD : TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>{DAY_LABELS[i]}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: isToday ? GOLD : TEXT_PRIMARY }}>{format(day, 'd')}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {daySessions.length === 0 ? (
                    <button onClick={() => { setNsDate(dateStr); setShowNewSession(true) }} style={{ background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 10, padding: '8px', color: TEXT_DIM, fontFamily: FONT_ALT, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, letterSpacing: '0.5px' }}><Plus size={12} /> Ajouter</button>
                  ) : daySessions.map(s => {
                    const color = SESSION_COLORS[s.session_type] ?? GOLD
                    const client = clients.find(c => c.client_id === s.client_id)
                    const clientName = client?.profiles?.full_name ?? 'Client'
                    const dt = new Date(s.scheduled_at)
                    return (
                      <div key={s.id} className="coach-clickable" onClick={() => setSelectedSession(s)} style={{ background: GOLD_DIM, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700, color: GOLD, flexShrink: 0 }}>{format(dt, 'HH:mm')}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: TEXT_PRIMARY, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName} · {s.session_type}</span>
                        <span style={{ fontFamily: FONT_ALT, fontSize: '0.62rem', color: TEXT_MUTED, flexShrink: 0 }}>{s.duration_minutes}min</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* DESKTOP : grille 7 colonnes */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, padding: '12px 16px' }}>
          {days.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const daySessions = scheduledSessions.filter(s => s.scheduled_at.startsWith(dateStr)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
            return (
              <div key={i} style={{ background: BG_CARD, border: `1px solid ${isToday ? GOLD_RULE : BORDER}`, borderRadius: RADIUS_CARD, overflow: 'hidden', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 6px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, background: isToday ? GOLD_DIM : 'transparent' }}>
                  <div style={{ fontFamily: FONT_ALT, fontSize: '0.6rem', fontWeight: 700, color: isToday ? GOLD : TEXT_MUTED, letterSpacing: '1px', textTransform: 'uppercase' }}>{DAY_LABELS[i]}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.3rem', fontWeight: 700, color: isToday ? GOLD : TEXT_PRIMARY, lineHeight: 1.1 }}>{format(day, 'd')}</div>
                </div>
                <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {daySessions.map(s => {
                    const color = SESSION_COLORS[s.session_type] ?? GOLD
                    const client = clients.find(c => c.client_id === s.client_id)
                    const clientName = client?.profiles?.full_name ?? 'Client'
                    const dt = new Date(s.scheduled_at)
                    return (
                      <div key={s.id} className="coach-clickable" onClick={() => setSelectedSession(s)} style={{ background: GOLD_DIM, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontFamily: FONT_ALT, fontSize: '0.68rem', fontWeight: 700, color: GOLD }}>{format(dt, 'HH:mm')}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: '0.66rem', color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: '0.6rem', color: TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.session_type}</span>
                      </div>
                    )
                  })}
                  <button onClick={() => { setNsDate(dateStr); setShowNewSession(true) }} title="Ajouter une séance" style={{ marginTop: 'auto', background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 6, padding: '5px', color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Vue mois ── */}
      {calView === 'month' && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {['L','M','M','J','V','S','D'].map((l, idx) => (
              <div key={idx} style={{ textAlign: 'center', fontFamily: FONT_ALT, fontSize: '0.62rem', fontWeight: 700, color: TEXT_MUTED, letterSpacing: '1px' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {monthGrid.map(({ date, inMonth }, idx) => {
              const dateStr = date.toISOString().split('T')[0]
              const isToday = dateStr === todayStr
              const daySessions = scheduledSessions.filter(s => s.scheduled_at.startsWith(dateStr))
              const goToWeek = () => {
                const today0 = new Date(); const dow0 = today0.getDay(); const d0 = dow0 === 0 ? -6 : 1 - dow0
                const mondayThis = new Date(today0); mondayThis.setDate(today0.getDate() + d0); mondayThis.setHours(0,0,0,0)
                const dow1 = date.getDay(); const d1 = dow1 === 0 ? -6 : 1 - dow1
                const mondayTarget = new Date(date); mondayTarget.setDate(date.getDate() + d1); mondayTarget.setHours(0,0,0,0)
                const weeks = Math.round((mondayTarget.getTime() - mondayThis.getTime()) / (7 * 86400000))
                setCalWeekOffset(weeks); setCalView('week')
              }
              return (
                <div key={idx} onClick={goToWeek} className={inMonth ? 'coach-clickable' : undefined}
                  style={{ minHeight: 64, background: inMonth ? BG_CARD : 'transparent', border: `1px solid ${isToday ? GOLD_RULE : (inMonth ? BORDER : 'transparent')}`, borderRadius: 8, padding: '5px 6px', cursor: inMonth ? 'pointer' : 'default', opacity: inMonth ? 1 : 0.35, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? GOLD : TEXT_PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: isToday ? GOLD_DIM : 'transparent', alignSelf: 'flex-start' }}>{format(date, 'd')}</span>
                  {daySessions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 'auto' }}>
                      {daySessions.slice(0, 4).map(s => (
                        <span key={s.id} style={{ width: 6, height: 6, borderRadius: '50%', background: SESSION_COLORS[s.session_type] ?? GOLD }} />
                      ))}
                      {daySessions.length > 4 && <span style={{ fontSize: '0.55rem', color: TEXT_MUTED }}>+{daySessions.length - 4}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
