import { useTranslations } from 'next-intl'
import { cardStyle, colors, fonts } from '../../../../lib/design-tokens'
import type { ProgressSectionId } from './types'

const SECTIONS: readonly { id: ProgressSectionId; label: 'poids' | 'records' | 'photos' | 'mensurations' | 'bienetre' | 'graphiques' }[] = [
  { id: 'poids', label: 'poids' }, { id: 'records', label: 'records' },
  { id: 'photos', label: 'photos' }, { id: 'mensurations', label: 'mensurations' },
  { id: 'bienetre', label: 'bienetre' }, { id: 'graphiques', label: 'graphiques' },
]

export function ProgressOverviewSection(props: {
  readonly sessions: number
  readonly records: number
  readonly totalVolume: number
  readonly streak: number
  readonly activeSection: ProgressSectionId
  readonly onNavigate: (section: ProgressSectionId) => void
}) {
  const t = useTranslations('progress')
  return <>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: fonts.headline, fontSize: 24, fontWeight: 400, color: colors.gold, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase' }}>ANALYTICS</div>
      <div style={{ fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: colors.textDim, textTransform: 'uppercase', marginTop: 4 }}>
        {t('headerSubtitle', { sessions: props.sessions, records: props.records })}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
      {[
        { label: t('tab.sessions'), value: props.sessions },
        { label: t('stats.volume'), value: props.totalVolume >= 1000 ? `${(props.totalVolume / 1000).toFixed(1)}T` : `${Math.round(props.totalVolume)}kg` },
        { label: t('tab.streak'), value: props.streak },
      ].map(stat => <div key={stat.label} style={{ ...cardStyle, padding: 14, textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.headline, fontSize: 22, fontWeight: 800, color: colors.gold }}>{stat.value}</div>
        <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>{stat.label}</div>
      </div>)}
    </div>
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8 }}>
      {SECTIONS.map(({ id, label }) => {
        const active = props.activeSection === id
        return <button key={id} onClick={() => props.onNavigate(id)} style={{
          flexShrink: 0, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: fonts.headline,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: active ? colors.goldBorder : 'transparent', border: `1px solid ${active ? `${colors.gold}66` : colors.goldBorder}`,
          color: active ? colors.gold : 'rgba(255,255,255,0.4)', transition: 'all 150ms',
        }}>{t(`pills.${label}`)}</button>
      })}
    </div>
  </>
}
