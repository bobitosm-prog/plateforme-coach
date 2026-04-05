'use client'
import { motion } from 'framer-motion'
import {
  ScheduledSession, SESSION_COLORS, SESSION_CATEGORY,
  DAY_LABELS_SHORT, getWeekDates, toDateStr, isSameDay,
} from '../../lib/schedule-utils'
import {
  BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GREEN, RED,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'

interface WeekCalendarProps {
  sessions: ScheduledSession[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onToggleMonth?: () => void
}

export default function WeekCalendar({ sessions, selectedDate, onSelectDate, onToggleMonth }: WeekCalendarProps) {
  const today = new Date()
  const weekDates = getWeekDates(selectedDate)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{
          fontFamily: FONT_ALT,
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', color: GOLD, margin: 0,
        }}>
          Planning semaine
        </h2>
        {onToggleMonth && (
          <button
            onClick={onToggleMonth}
            style={{
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: '4px 10px', cursor: 'pointer',
              fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 600,
              fontFamily: FONT_ALT,
            }}
          >
            Voir le mois
          </button>
        )}
      </div>

      {/* Week list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {weekDates.map(date => {
          const dateStr = toDateStr(date)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDate)
          const daySessions = sessions.filter(s => s.scheduled_date === dateStr)
          const mainSession = daySessions.find(s => !['hiit', 'liss'].includes(s.session_type)) || daySessions[0]
          const allCompleted = daySessions.length > 0 && daySessions.every(s => s.completed)
          const isPast = date < today && !isSameDay(date, today)
          const isRest = !mainSession || mainSession.session_type === 'rest'
          const missed = isPast && daySessions.length > 0 && !allCompleted && !isRest
          const isFuture = date > today && !isToday

          const mainColor = mainSession ? SESSION_COLORS[mainSession.session_type] : BORDER

          // Session label
          let sessionLabel = 'Repos'
          if (mainSession && mainSession.session_type !== 'rest') {
            sessionLabel = mainSession.title || SESSION_CATEGORY[mainSession.session_type] || mainSession.session_type
          }

          // Badge
          let badge: { label: string; bg: string; color: string } | null = null
          if (isRest) {
            badge = null
          } else if (isToday) {
            badge = { label: 'Aujourd\'hui', bg: `${GOLD}20`, color: GOLD }
          } else if (isPast && allCompleted) {
            badge = { label: 'Fait', bg: 'rgba(34,197,94,0.15)', color: '#22C55E' }
          } else if (missed) {
            badge = { label: 'Manqué', bg: 'rgba(239,68,68,0.15)', color: '#EF4444' }
          } else if (isFuture) {
            badge = { label: 'À venir', bg: 'rgba(251,191,36,0.1)', color: '#FBBF24' }
          }

          return (
            <motion.button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: isSelected ? GOLD : (isToday ? GOLD_DIM : BG_CARD),
                border: isToday
                  ? `1px solid ${GOLD}`
                  : isSelected
                    ? `1px solid ${mainColor}60`
                    : `1px solid ${BORDER}`,
                cursor: 'pointer',
                opacity: isPast && !isToday ? 0.5 : 1,
                width: '100%',
                textAlign: 'left',
              }}
            >
              {/* Day abbrev */}
              <span style={{
                fontFamily: FONT_ALT,
                fontSize: '0.72rem', fontWeight: 700,
                color: isSelected ? '#0D0B08' : isToday ? GOLD : TEXT_MUTED,
                width: 28, flexShrink: 0,
                textTransform: 'uppercase', letterSpacing: '2px',
              }}>
                {DAY_LABELS_SHORT[date.getDay()]}
              </span>

              {/* Day number */}
              <span style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '1rem', fontWeight: 700,
                color: isSelected ? '#0D0B08' : isToday ? GOLD : TEXT_PRIMARY,
                width: 24, flexShrink: 0, textAlign: 'center',
              }}>
                {date.getDate()}
              </span>

              {/* Color dot + session type */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {mainSession && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: mainColor, flexShrink: 0,
                  }} />
                )}
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700,
                  color: isSelected ? '#0D0B08' : (isRest ? TEXT_MUTED : (isToday ? TEXT_PRIMARY : `${TEXT_PRIMARY}CC`)),
                  letterSpacing: '0.02em',
                  fontFamily: FONT_ALT,
                }}>
                  {sessionLabel}
                </span>
              </div>

              {/* Badge */}
              {badge && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700,
                  padding: '3px 8px', borderRadius: 12,
                  background: badge.bg, color: isSelected ? '#05050599' : badge.color,
                  flexShrink: 0, letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  fontFamily: FONT_ALT,
                }}>
                  {badge.label}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
