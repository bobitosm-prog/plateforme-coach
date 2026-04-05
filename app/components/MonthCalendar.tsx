'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  ScheduledSession, SESSION_COLORS, getMonthDates, toDateStr, isSameDay,
} from '../../lib/schedule-utils'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM,
  TEXT_PRIMARY, TEXT_MUTED,
  RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../lib/design-tokens'

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAY_HEADERS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']

interface MonthCalendarProps {
  sessions: ScheduledSession[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
}

export default function MonthCalendar({ sessions, selectedDate, onSelectDate, onClose }: MonthCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const dates = getMonthDates(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD,
        padding: 16, marginBottom: 16,
      }}
    >
      {/* Header with nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={18} color={TEXT_MUTED} />
        </button>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY,
          letterSpacing: '2px', textTransform: 'uppercase',
        }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronRight size={18} color={TEXT_MUTED} />
          </button>
          <button onClick={onClose} style={{ background: BG_CARD_2, border: `1px solid ${BORDER}`, borderRadius: 12, cursor: 'pointer', padding: 4, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color={TEXT_MUTED} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.5rem', fontWeight: 700,
            color: TEXT_MUTED, letterSpacing: '2px', padding: '2px 0',
            fontFamily: FONT_ALT, textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {dates.map((date, i) => {
          const dateStr = toDateStr(date)
          const inMonth = date.getMonth() === viewMonth
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDate)
          const daySessions = sessions.filter(s => s.scheduled_date === dateStr)

          // GOLD dots for events
          const hasSessions = daySessions.length > 0

          return (
            <button
              key={i}
              onClick={() => { onSelectDate(date); onClose() }}
              style={{
                background: isSelected ? GOLD : 'transparent',
                border: isToday ? `1.5px solid ${GOLD}` : '1.5px solid transparent',
                borderRadius: 12,
                padding: '6px 2px 4px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, opacity: inMonth ? 1 : 0.3,
              }}
            >
              <span style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '0.72rem', fontWeight: isToday ? 700 : 500,
                color: isSelected ? '#050505' : isToday ? GOLD : TEXT_PRIMARY,
              }}>
                {date.getDate()}
              </span>

              {/* Session dots — all GOLD */}
              {hasSessions && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {daySessions.slice(0, 3).map((_, j) => (
                    <div key={j} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: isSelected ? '#050505' : GOLD,
                    }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
