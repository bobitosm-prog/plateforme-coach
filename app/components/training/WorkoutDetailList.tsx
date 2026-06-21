'use client'

import { useLocale, useTranslations } from 'next-intl'
import { colors, fonts } from '../../../lib/design-tokens'

interface WorkoutDetailListProps {
  detail: { name: string; sets: any[] }[]
  loading: boolean
}

const statCard: React.CSSProperties = {
  background: colors.surface2, border: `1px solid ${colors.divider}`,
  borderRadius: 12, padding: 14, textAlign: 'center',
}

const exerciseCard: React.CSSProperties = {
  background: colors.surface2, border: `1px solid ${colors.divider}`,
  borderRadius: 14, padding: 14, marginBottom: 10,
}

const gridHeader: React.CSSProperties = {
  fontFamily: fonts.body, fontSize: 9, fontWeight: 700,
  color: colors.textDim, letterSpacing: 1,
}

export default function WorkoutDetailList({ detail, loading }: WorkoutDetailListProps) {
  const locale = useLocale()
  const t = useTranslations('training_tab')

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>{t('calendar.loading')}</div>
  }

  if (detail.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim, fontSize: 14, fontFamily: fonts.body }}>{t('programs.noDetails')}</div>
  }

  const totalExercises = detail.length
  const totalSets = detail.reduce((s, e) => s + e.sets.length, 0)
  const totalVolume = detail.reduce((s, e) => s + e.sets.reduce((a, st) => a + (st.weight || 0) * (st.reps || 0), 0), 0)

  return (
    <>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontFamily: fonts.headline, fontSize: 26, color: colors.gold }}>{totalSets}</div>
          <div style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase' }}>SETS</div>
        </div>
        <div style={statCard}>
          <div style={{ fontFamily: fonts.headline, fontSize: 26, color: colors.gold }}>{totalExercises}</div>
          <div style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase' }}>EXERCICES</div>
        </div>
        <div style={statCard}>
          <div style={{ fontFamily: fonts.headline, fontSize: 26, color: colors.gold }}>{totalVolume.toLocaleString(locale)}</div>
          <div style={{ fontFamily: fonts.alt, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase' }}>KG VOLUME</div>
        </div>
      </div>

      {/* Exercise cards */}
      {detail.map((ex, i) => (
        <div key={i} style={exerciseCard}>
          {/* Exercise header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: colors.gold, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: colors.gold, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>{ex.name}</span>
            <span style={{ fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, color: colors.textDim, letterSpacing: '0.1em', flexShrink: 0 }}>{ex.sets.length} SETS</span>
          </div>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1.2fr', gap: 6, padding: '0 0 4px', marginBottom: 2 }}>
            <span style={gridHeader}>SET</span>
            <span style={gridHeader}>KG</span>
            <span style={gridHeader}>REPS</span>
            <span style={{ ...gridHeader, textAlign: 'right' }}>VOLUME</span>
          </div>
          {/* Set rows */}
          {ex.sets.map((set: any, si: number) => (
            <div key={si} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1.2fr', gap: 6, alignItems: 'center', padding: '5px 0', borderTop: `1px solid ${colors.goldBorder}` }}>
              <span style={{ fontFamily: fonts.headline, fontSize: 13, color: colors.gold, width: 22, height: 22, borderRadius: 6, background: colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{si + 1}</span>
              <span style={{ fontFamily: fonts.headline, fontSize: 17, color: colors.text }}>{(set.weight || 0).toLocaleString(locale)}</span>
              <span style={{ fontFamily: fonts.headline, fontSize: 17, color: colors.text }}>{set.reps || 0}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'right' }}>{((set.weight || 0) * (set.reps || 0)).toLocaleString(locale)} kg</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
