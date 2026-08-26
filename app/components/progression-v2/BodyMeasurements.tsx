'use client'

import { Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import {
  PROGRESSION_MEASUREMENT_FIELDS,
  type ProgressionMeasurementField,
  type ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type MeasurementsModel = ProgressionViewModel['measurements']

export function getMeasurementsState(measurements: MeasurementsModel) {
  return measurements.state
}

function signed(value: number, locale: string): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString(locale, { maximumFractionDigits: 1 })}`
}

function sparklinePoints(series: Array<{ date: string; value: number }>): string {
  if (series.length < 2) return ''
  const values = series.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return series.map((point, index) => {
    const x = (index / (series.length - 1)) * 100
    const y = 30 - ((point.value - min) / range) * 24
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function MeasurementCard({
  field,
  measurements,
}: {
  field: ProgressionMeasurementField
  measurements: MeasurementsModel
}) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const value = measurements.fields[field]
  return <article className={styles.measurementCard} data-state={value?.state ?? 'empty'}>
    <span className={styles.measurementLabel}>{t(`measurements.fields.${field}`)}</span>
    <strong>{value ? `${value.current.toLocaleString(locale, { maximumFractionDigits: 1 })} cm` : '—'}</strong>
    <span className={styles.measurementDelta}>
      {value?.delta == null ? t('measurements.noComparison') : t('measurements.delta', { value: signed(value.delta, locale) })}
    </span>
    {value && value.series.length > 1 && <svg className={styles.sparkline} viewBox="0 0 100 36" role="img" aria-label={t('measurements.trendLabel', { field: t(`measurements.fields.${field}`) })}>
      <polyline points={sparklinePoints(value.series)} />
    </svg>}
  </article>
}

export default function BodyMeasurements({
  measurements,
  onAddMeasurement,
}: {
  measurements: MeasurementsModel
  onAddMeasurement: () => void
}) {
  const t = useTranslations('progress.v2')

  return <section id="progression-v2-measurements" className={styles.detailSection} aria-labelledby="progression-measurements-title">
    <div className={styles.detailHeading}>
      <div>
        <p className={styles.eyebrow}>{t('measurements.eyebrow')}</p>
        <h2 id="progression-measurements-title">{t('measurements.title')}</h2>
        <p>{t('measurements.subtitle')}</p>
      </div>
      <button type="button" className={styles.secondaryButton} onClick={onAddMeasurement}>
        <Plus size={16} aria-hidden="true" />
        {t('measurements.add')}
      </button>
    </div>

    {measurements.state === 'loading' && <div className={styles.detailState} aria-busy="true" aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span>{t('states.loading')}</span>
    </div>}

    {measurements.state === 'error' && <div className={styles.detailState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('measurements.unavailable')}</span>
    </div>}

    {measurements.state === 'empty' && <div className={styles.detailState}>
      <strong>{t('states.insufficient')}</strong>
      <span>{t('measurements.empty')}</span>
      <button type="button" className={styles.secondaryButton} onClick={onAddMeasurement}>{t('measurements.add')}</button>
    </div>}

    {(measurements.state === 'ready' || measurements.state === 'partial') && <>
      {measurements.state === 'partial' && <p className={styles.inlineNotice}>{t('measurements.partial')}</p>}
      <div className={styles.measurementGrid}>
        {PROGRESSION_MEASUREMENT_FIELDS.map(field => <MeasurementCard key={field} field={field} measurements={measurements} />)}
      </div>
    </>}
  </section>
}
