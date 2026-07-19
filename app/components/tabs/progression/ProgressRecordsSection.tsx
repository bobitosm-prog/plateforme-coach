import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { Star, Trophy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { cardStyle, colors, fonts, mutedStyle } from '../../../../lib/design-tokens'
import { getExerciseName } from '../../../../lib/i18n-exercise'
import SectionTitle from '../../ui/SectionTitle'
import type { ProgressRecordView } from './types'

export function ProgressRecordsSection(props: {
  readonly records: readonly ProgressRecordView[]
  readonly limit: number
  readonly dateLocale: Locale
  readonly onLimitChange: (limit: number) => void
}) {
  const t = useTranslations('progress')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  return <div>
    <SectionTitle noPadding title={t('tab.personalRecords')} trailing={t('weight.prCount', { count: props.records.length })} />
    <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[10, 50, 100].map(limit => <button key={limit} onClick={() => props.onLimitChange(limit)} style={{ padding: '5px 14px', borderRadius: 20, border: props.limit === limit ? `1px solid ${colors.gold}` : `1px solid ${colors.goldDim}`, background: props.limit === limit ? colors.goldDim : 'transparent', color: props.limit === limit ? colors.gold : colors.textMuted, fontFamily: fonts.alt, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{limit}</button>)}
      </div>
      {props.records.length ? props.records.slice(0, props.limit).map((record, index) => {
        const principal = record.maxWeight ?? record.oneRm
        return <div key={record.name + index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: index < Math.min(props.records.length, props.limit) - 1 ? `0.5px solid ${colors.goldDim}` : 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy size={14} color={colors.gold} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getExerciseName({ name: record.name }, locale)}</div>
            <div style={{ ...mutedStyle, fontSize: 9 }}>{record.date ? format(new Date(record.date), 'd MMM yyyy', { locale: props.dateLocale }) : ''}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontFamily: fonts.headline, fontSize: 16, fontWeight: 700, color: colors.gold }}>{principal}</span><span style={{ ...mutedStyle, fontSize: 9, marginLeft: 2 }}>{record.unit}</span>
            {record.oneRm && record.maxWeight ? <div style={{ ...mutedStyle, fontSize: 9, marginTop: 1 }}>{t('analytics.estimated1rmValue', { value: record.oneRm, unit: record.unit ?? '' })}</div> : null}
          </div>
        </div>
      }) : <div style={{ textAlign: 'center', padding: '24px 0' }}><Star size={28} color={colors.textDim} style={{ marginBottom: 6 }} /><p style={{ ...mutedStyle, fontSize: 12, margin: 0 }}>{t('tab.firstRecord')}</p></div>}
    </div>
  </div>
}
