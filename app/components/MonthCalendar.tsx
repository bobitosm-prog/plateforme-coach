'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  ScheduledSession, SESSION_COLORS, getMonthDates, toDateStr, isSameDay,
} from '../../lib/schedule-utils'
import { BG_BASE, BG_CARD, BORDER, TEXT_PRIMARY, TEXT_MUTED } from '../../lib/design-tokens'

const GOLD = '#C9A84C'
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
        background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: 16, marginBottom: 16,
      }}
    >
      {/* Header with nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={18} color={TEXT_MUTED} />
        </button>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY,
        }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronRight size={18} color={TEXT_MUTED} />
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer', padding: 4 }}>
            <X size={14} color={TEXT_MUTED} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.5rem', fontWeight: 700,
            color: TEXT_MUTED, letterSpacing: '0.05em', padding: '2px 0',
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

          // Get unique session colors for dots
          const dots = [...new Set(daySessions.map(s => SESSION_COLORS[s.session_type]))].slice(0, 3)

          return (
            <button
              key={i}
              onClick={() => { onSelectDate(date); onClose() }}
              style={{
                background: isSelected ? `${GOLD}20` : 'transparent',
                border: isToday ? `1.5px solid ${GOLD}` : '1.5px solid transparent',
                borderRadius: 8,
                padding: '6px 2px 4px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, opacity: inMonth ? 1 : 0.3,
              }}
            >
              <span style={{
                fontSize: '0.72rem', fontWeight: isToday ? 700 : 500,
                color: isToday ? GOLD : TEXT_PRIMARY,
              }}>
                {date.getDate()}
              </span>

              {/* Session dots */}
              {dots.length > 0 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {dots.map((color, j) => (
                    <div key={j} style={{
                      width: 4, height: 4, borderRadius: '50%', background: color,
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
