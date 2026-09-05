'use client'

import { Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type WeightModel = ProgressionViewModel['weight']

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const CHART_PADDING_X = 32
const CHART_PADDING_Y = 24

export function getWeightHistoryState(weight: WeightModel) {
  return weight.state
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
}

function dateLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Zurich',
  }).format(new Date(`${date}T12:00:00Z`))
}

function chartPoints(weight: WeightModel): {
  points: string
  last: { x: number; y: number } | null
  targetY: number | null
  min: number
  max: number
} {
  const values = weight.series.map(point => point.value)
  if (weight.target != null) values.push(weight.target)
  const rawMin = values.length ? Math.min(...values) : 0
  const rawMax = values.length ? Math.max(...values) : 1
  const padding = Math.max((rawMax - rawMin) * 0.15, 0.5)
  const min = rawMin - padding
  const max = rawMax + padding
  const range = max - min || 1
  const width = CHART_WIDTH - CHART_PADDING_X * 2
  const height = CHART_HEIGHT - CHART_PADDING_Y * 2
  const coordinates = weight.series.map((point, index) => ({
    x: CHART_PADDING_X + (weight.series.length === 1 ? width / 2 : (index / (weight.series.length - 1)) * width),
    y: CHART_PADDING_Y + ((max - point.value) / range) * height,
  }))
  return {
    points: coordinates.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
    last: coordinates[coordinates.length - 1] ?? null,
    targetY: weight.target == null ? null : CHART_PADDING_Y + ((max - weight.target) / range) * height,
    min,
    max,
  }
}

export default function WeightHistory({
  weight,
  onAddWeight,
}: {
  weight: WeightModel
  onAddWeight: () => void
}) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const chart = chartPoints(weight)
  const periodLabel = t(`periods.${weight.period.key}`)

  return <section id="progression-v2-weight" className={styles.detailSection} aria-labelledby="progression-weight-title">
    <div className={styles.detailHeading}>
      <div>
        <p className={styles.eyebrow}>{t('weightHistory.eyebrow')}</p>
        <h2 id="progression-weight-title">{t('weightHistory.title')}</h2>
        <p>{t('weightHistory.subtitle', { period: periodLabel })}</p>
      </div>
      <button type="button" className={styles.secondaryButton} onClick={onAddWeight}>
        <Plus size={16} aria-hidden="true" />
        {t('weightHistory.add')}
      </button>
    </div>

    {weight.period.key === 'all' && weight.period.isTruncated && weight.period.availableFrom && (
      <p className={styles.availability}>{t('availableSince', { date: dateLabel(weight.period.availableFrom, locale) })}</p>
    )}

    {weight.state === 'loading' && <div className={styles.detailState} aria-busy="true" aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span>{t('states.loading')}</span>
    </div>}

    {weight.state === 'error' && <div className={styles.detailState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('weightHistory.unavailable')}</span>
    </div>}

    {weight.state === 'empty' && <div className={styles.detailState}>
      <strong>{t('states.insufficient')}</strong>
      <span>{t('weightHistory.empty')}</span>
      <button type="button" className={styles.secondaryButton} onClick={onAddWeight}>{t('weightHistory.add')}</button>
    </div>}

    {(weight.state === 'ready' || weight.state === 'partial') && <>
      <div className={styles.weightMetrics}>
        <div>
          <span>{t('currentWeight')}</span>
          <strong>{weight.current == null ? '—' : `${weight.current.toLocaleString(locale, { maximumFractionDigits: 1 })} kg`}</strong>
        </div>
        <div>
          <span>{t('weightHistory.target')}</span>
          <strong>{weight.target == null ? t('weightHistory.notSet') : `${weight.target.toLocaleString(locale, { maximumFractionDigits: 1 })} kg`}</strong>
        </div>
        <div>
          <span>{t('weightHistory.change')}</span>
          <strong>{weight.delta == null ? '—' : `${signed(weight.delta)} kg`}</strong>
        </div>
      </div>

      {weight.series.length > 1 ? <figure className={styles.weightFigure}>
        <figcaption className={styles.srOnly}>
          {t('weightHistory.accessibleSummary', {
            count: weight.series.length,
            current: weight.current ?? '—',
            delta: weight.delta == null ? '—' : signed(weight.delta),
            period: periodLabel,
          })}
        </figcaption>
        <svg className={styles.weightChart} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-labelledby="progression-weight-chart-title">
          <title id="progression-weight-chart-title">{t('weightHistory.chartTitle')}</title>
          {[0.25, 0.5, 0.75].map(ratio => <line key={ratio} x1={CHART_PADDING_X} x2={CHART_WIDTH - CHART_PADDING_X} y1={CHART_HEIGHT * ratio} y2={CHART_HEIGHT * ratio} className={styles.chartGrid} />)}
          {chart.targetY != null && <line x1={CHART_PADDING_X} x2={CHART_WIDTH - CHART_PADDING_X} y1={chart.targetY} y2={chart.targetY} className={styles.targetLine} />}
          <polyline points={chart.points} className={styles.weightLine} />
          {chart.last && <circle cx={chart.last.x} cy={chart.last.y} r="6" className={styles.weightPoint} />}
          <text x="2" y={CHART_PADDING_Y + 4} className={styles.chartLabel}>{chart.max.toFixed(1)}</text>
          <text x="2" y={CHART_HEIGHT - CHART_PADDING_Y + 4} className={styles.chartLabel}>{chart.min.toFixed(1)}</text>
        </svg>
        <div className={styles.chartDates}>
          <span>{dateLabel(weight.series[0].date, locale)}</span>
          <span>{dateLabel(weight.series[weight.series.length - 1].date, locale)}</span>
        </div>
        <div className={styles.chartLegend}>
          <span><i className={styles.legendWeight} />{t('weightHistory.actual')}</span>
          {weight.target != null && <span><i className={styles.legendTarget} />{t('weightHistory.target')}</span>}
        </div>
      </figure> : <div className={styles.inlineNotice}>{t('states.insufficient')}</div>}
    </>}
  </section>
}
