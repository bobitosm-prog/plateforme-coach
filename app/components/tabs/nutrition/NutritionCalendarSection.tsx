import type { RefObject } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { bodyStyle, colors, fonts } from '@/lib/design-tokens'

interface NutritionCalendarSectionProps {
  calendarDays: string[]
  selectedDate: string
  today: string
  daysWithMeals: ReadonlySet<string>
  locale: string
  scrollRef: RefObject<HTMLDivElement | null>
  todayLabel: string
  futureDateLabel: string
  onSelectDate: (date: string) => void
}

export function NutritionCalendarSection(props: NutritionCalendarSectionProps) {
  const { calendarDays, selectedDate, today, daysWithMeals, locale, scrollRef, todayLabel, futureDateLabel, onSelectDate } = props
  const glassButton = { width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const
  return <>
    <div style={{ background: colors.surface2, border: `1px solid ${colors.divider}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.textDim }}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase()}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedDate !== today && <button onClick={() => onSelectDate(today)} style={{ ...glassButton, width: 'auto', padding: '6px 12px', fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: colors.gold, textTransform: 'uppercase' }}>{todayLabel}</button>}
          <button onClick={() => scrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} aria-label="Précédent" style={glassButton}><ChevronLeft size={16} color={colors.gold} /></button>
          <button onClick={() => scrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} aria-label="Suivant" style={glassButton}><ChevronRight size={16} color={colors.gold} /></button>
        </div>
      </div>
      <div ref={scrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
        {calendarDays.map(date => {
          const value = new Date(`${date}T12:00:00`)
          const selected = date === selectedDate
          const isToday = date === today
          const future = date > today
          return <button key={date} id={`cal-${date}`} onClick={() => !future && onSelectDate(date)} disabled={future} title={future ? futureDateLabel : undefined} aria-disabled={future} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', minWidth: 44, borderRadius: 12, border: selected ? `2px solid ${colors.gold}` : isToday ? `1px solid ${colors.goldRule}` : `1px solid ${colors.divider}`, background: selected ? `${colors.gold}12` : 'transparent', cursor: future ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: future ? 0.35 : 1, scrollSnapAlign: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: selected ? colors.gold : colors.textDim }}>{value.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
            <span style={{ fontFamily: fonts.headline, fontSize: 20, fontWeight: 400, lineHeight: 1, color: selected || isToday ? colors.gold : colors.text }}>{value.getDate()}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: daysWithMeals.has(date) ? colors.gold : 'transparent' }} />
          </button>
        })}
      </div>
    </div>
    {selectedDate < today && <div style={{ background: colors.goldDim, border: `1px solid ${colors.goldRule}`, borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <CalendarDays size={16} color={colors.orange} />
      <span style={{ ...bodyStyle, fontSize: 13, color: colors.gold }}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
    </div>}
  </>
}
