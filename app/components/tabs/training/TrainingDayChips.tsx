'use client'
import { WEEK_DAYS } from '../../../../lib/design-tokens'

const ORANGE = '#F97316'
const BG_CARD = '#1A1A1A'
const TEXT_MUTED = '#6B7280'

interface TrainingDayChipsProps {
  trainingDay: string
  todayKey: string
  coachProgram: any
  onSelectDay: (day: string) => void
}

export default function TrainingDayChips({ trainingDay, todayKey, coachProgram, onSelectDay }: TrainingDayChipsProps) {
  return (
    <div style={{ padding: '0 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {WEEK_DAYS.map(day => {
          const d = coachProgram[day] ?? { repos: false, exercises: [] }
          const isActive  = trainingDay === day
          const isToday   = day === todayKey
          const hasWork   = !d.repos && (d.exercises?.length || 0) > 0
          return (
            <button key={day} onClick={() => onSelectDay(day)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: isActive ? ORANGE : BG_CARD,
              outline: isToday && !isActive ? `2px solid ${ORANGE}` : 'none',
              transition: 'all 200ms',
            }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#000' : isToday ? ORANGE : TEXT_MUTED, textTransform: 'capitalize' }}>
                {day.slice(0, 3)}
              </span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasWork ? (isActive ? '#00000060' : ORANGE) : 'transparent', transition: 'background 200ms' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
