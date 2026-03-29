'use client'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import {
  ScheduledSession, SESSION_COLORS, SESSION_LABELS, SESSION_CATEGORY,
  DAY_LABELS_SHORT, getWeekDates, toDateStr, isSameDay,
} from '../../lib/schedule-utils'
import { BG_CARD, BORDER, TEXT_PRIMARY, TEXT_MUTED } from '../../lib/design-tokens'

const GOLD = '#C9A84C'

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
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: GOLD, margin: 0,
        }}>
          Planning semaine
        </h2>
        {onToggleMonth && (
          <button
            onClick={onToggleMonth}
            style={{
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
              fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 600,
            }}
          >
            📅 Voir le mois
          </button>
        )}
      </div>

      {/* Week strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {weekDates.map(date => {
          const dateStr = toDateStr(date)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDate)
          const daySessions = sessions.filter(s => s.scheduled_date === dateStr)
          const mainSession = daySessions.find(s => !['hiit', 'liss'].includes(s.session_type)) || daySessions[0]
          const hasCardio = daySessions.some(s => s.session_type === 'hiit' || s.session_type === 'liss')
          const allCompleted = daySessions.length > 0 && daySessions.every(s => s.completed)
          const isPast = date < today && !isSameDay(date, today)
          const missed = isPast && daySessions.length > 0 && !allCompleted && mainSession?.session_type !== 'rest'

          const mainColor = mainSession ? SESSION_COLORS[mainSession.session_type] : BORDER

          return (
            <motion.button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              whileTap={{ scale: 0.95 }}
              style={{
                background: isSelected ? `${mainColor}15` : BG_CARD,
                border: isToday
                  ? `2px solid ${GOLD}`
                  : isSelected
                    ? `2px solid ${mainColor}`
                    : `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '8px 2px 6px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, minWidth: 0,
                position: 'relative',
              }}
            >
              {/* Day label */}
              <span style={{
                fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em',
                color: isToday ? GOLD : TEXT_MUTED,
              }}>
                {DAY_LABELS_SHORT[date.getDay()]}
              </span>

              {/* Day number */}
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '1rem', fontWeight: 700,
                color: isToday ? GOLD : TEXT_PRIMARY,
              }}>
                {date.getDate()}
              </span>

              {/* Session badge */}
              {mainSession && (
                <span style={{
                  fontSize: '0.5rem', fontWeight: 700,
                  color: mainColor, letterSpacing: '0.02em',
                  lineHeight: 1.2, textAlign: 'center',
                }}>
                  {SESSION_CATEGORY[mainSession.session_type]}
                </span>
              )}
              {mainSession && mainSession.session_type !== 'rest' && (
                <span style={{
                  fontSize: '0.45rem', fontWeight: 600,
                  color: `${mainColor}BB`,
                }}>
                  {mainSession.session_type.includes('_') ? mainSession.session_type.split('_')[1].toUpperCase() : ''}
                </span>
              )}

              {/* Color dot */}
              {mainSession && (
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: mainColor, marginTop: 1,
                }} />
              )}

              {/* Cardio indicator */}
              {hasCardio && mainSession?.session_type !== 'hiit' && mainSession?.session_type !== 'liss' && (
                <span style={{ fontSize: '0.5rem', marginTop: -1 }}>🏃</span>
              )}

              {/* Completion status */}
              {allCompleted && daySessions.length > 0 && mainSession?.session_type !== 'rest' && (
                <Check size={10} color="#22C55E" strokeWidth={3} style={{ marginTop: 1 }} />
              )}
              {missed && (
                <X size={10} color="#EF444480" strokeWidth={3} style={{ marginTop: 1 }} />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
