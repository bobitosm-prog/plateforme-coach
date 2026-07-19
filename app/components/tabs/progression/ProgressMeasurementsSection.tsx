import { ChevronRight, Ruler } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cardStyle, colors, fonts, mutedStyle } from '../../../../lib/design-tokens'
import SectionTitle from '../../ui/SectionTitle'
import type { ProgressMeasurementView } from './types'

export function ProgressMeasurementsSection(props: {
  readonly measurement?: ProgressMeasurementView
  readonly onAddMeasurement: () => void
}) {
  const t = useTranslations('progress')
  const values = [
    { label: 'TAILLE', value: props.measurement?.waist }, { label: 'POITRINE', value: props.measurement?.chest },
    { label: 'BRAS', value: props.measurement?.left_arm }, { label: 'CUISSES', value: props.measurement?.left_thigh },
  ]
  return <div>
    <SectionTitle noPadding title={t('tab.measurementsSection')} />
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {values.map(item => <div key={item.label} style={{ background: `${colors.gold}0a`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
        <div><span style={{ fontFamily: fonts.headline, fontSize: 18, fontWeight: 800, color: colors.text }}>{item.value ?? '—'}</span><span style={{ ...mutedStyle, fontSize: 10, marginLeft: 2 }}>{item.value ? 'cm' : ''}</span></div>
      </div>)}
    </div></div>
    <button onClick={props.onAddMeasurement} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ruler size={20} color={colors.gold} /></div>
      <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>{t('measurements.title')}</div><div style={{ ...mutedStyle, fontSize: 10 }}>{t('tab.measureDesc')}</div></div>
      <ChevronRight size={16} color={colors.textDim} />
    </button>
  </div>
}
