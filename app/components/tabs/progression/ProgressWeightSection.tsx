import { ChevronRight, Scale } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cardStyle, colors, fonts, mutedStyle } from '../../../../lib/design-tokens'
import SectionTitle from '../../ui/SectionTitle'

export type ProgressWeightPeriod = '7' | '30' | '90' | 'all'

export function ProgressWeightSection(props: {
  readonly period: ProgressWeightPeriod
  readonly points: readonly { date: string; poids: number }[]
  readonly min: number
  readonly max: number
  readonly currentWeight?: number
  readonly goalWeight: number | null
  readonly delta: number
  readonly deltaPositive: boolean
  readonly onPeriodChange: (period: ProgressWeightPeriod) => void
  readonly onAddWeight: () => void
}) {
  const t = useTranslations('progress')
  const latest = props.points.at(-1)?.poids
  return <div>
    <SectionTitle noPadding title={t('weight.title')} trailing={props.period === 'all' ? 'TOUT' : `${props.period}J`} />
    <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: fonts.headline, fontSize: 32, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
            {props.currentWeight || latest || '—'}<span style={{ ...mutedStyle, fontSize: 14, marginLeft: 4 }}>KG</span>
          </div>
          {props.goalWeight && <div style={{ ...mutedStyle, fontSize: 10, marginTop: 4 }}>{t('tab.goal', { weight: props.goalWeight })}</div>}
        </div>
        {props.delta !== 0 && <div style={{ padding: '4px 10px', borderRadius: 999, background: props.deltaPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${props.deltaPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          <span style={{ fontFamily: fonts.headline, fontSize: 12, fontWeight: 700, color: props.deltaPositive ? colors.success : colors.error }}>{props.delta > 0 ? '+' : ''}{props.delta} kg</span>
        </div>}
      </div>
      {props.points.length > 1 && <svg viewBox="0 0 300 90" style={{ width: '100%', height: 90, overflow: 'visible' }} preserveAspectRatio="none">
        <polyline points={props.points.map((point, index) => `${((index / (props.points.length - 1)) * 300).toFixed(1)},${(90 - ((point.poids - props.min) / ((props.max - props.min) || 1)) * 86).toFixed(1)}`).join(' ')} fill="none" stroke={colors.gold} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={300} cy={90 - (((latest ?? props.min) - props.min) / ((props.max - props.min) || 1)) * 86} r="5" fill={colors.gold} />
      </svg>}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {(['7', '30', '90', 'all'] as const).map(period => {
          const active = props.period === period
          return <button key={period} onClick={() => props.onPeriodChange(period)} style={{ padding: '4px 10px', borderRadius: 999, border: active ? `1px solid ${colors.gold}4d` : '1px solid transparent', background: active ? `${colors.gold}33` : `${colors.gold}1a`, color: colors.gold, fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{period === 'all' ? 'TOUT' : `${period}J`}</button>
        })}
      </div>
    </div>
    <button onClick={props.onAddWeight} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Scale size={20} color={colors.gold} /></div>
      <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>{t('tab.logWeight')}</div><div style={{ ...mutedStyle, fontSize: 10 }}>{t('weight.addMeasure')}</div></div>
      <ChevronRight size={16} color={colors.textDim} />
    </button>
  </div>
}
