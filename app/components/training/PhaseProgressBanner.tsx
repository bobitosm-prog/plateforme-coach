'use client'
import { useTranslations } from 'next-intl'
import { colors, fonts } from '../../../lib/design-tokens'
import { getEffectiveWeek } from '../../../lib/training/program-week'

interface PhaseProgressBannerProps {
  program: {
    phases?: { name: string; weeks: number[] }[]
    total_weeks: number
    current_week?: number
    start_date?: string | null
  }
}

export default function PhaseProgressBanner({ program }: PhaseProgressBannerProps) {
  const t = useTranslations('training_tab.phase')
  const week = getEffectiveWeek(program)
  const totalWeeks = program.total_weeks
  const phase = (program.phases || []).find((p) => week >= p.weeks[0] && week <= p.weeks[1])
  const progress = week / totalWeeks

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999 }}>
          {phase?.name || `Phase ${week <= 4 ? 1 : week <= 8 ? 2 : 3}`}
        </span>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.textMuted }}>
          {t('week', { current: week, total: totalWeeks })}
        </span>
      </div>
      <div style={{ height: 4, background: colors.goldDim, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: colors.gold, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}
