'use client'
import {
  WEEK_DAYS, GOLD, GOLD_RULE, BORDER, TEXT_MUTED, FONT_ALT,
} from '../../../../lib/design-tokens'

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
              padding: '10px 14px', borderRadius: 0, cursor: 'pointer',
              background: isActive ? GOLD : 'transparent',
              border: isActive ? 'none' : `1px solid ${BORDER}`,
              outline: isToday && !isActive ? `2px solid ${GOLD_RULE}` : 'none',
              transition: 'all 200ms',
            }}>
              <span style={{ fontFamily: FONT_ALT, fontSize: 13, fontWeight: 700, color: isActive ? '#050505' : isToday ? GOLD : TEXT_MUTED, textTransform: 'capitalize' }}>
                {day.slice(0, 3)}
              </span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasWork ? (isActive ? '#05050560' : GOLD) : 'transparent', transition: 'background 200ms' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
