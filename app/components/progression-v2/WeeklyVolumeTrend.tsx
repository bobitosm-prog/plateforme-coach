'use client'

import { useLocale, useTranslations } from 'next-intl'

import type { ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type VolumeModel = ProgressionViewModel['volume']

const CHART_WIDTH = 760
const CHART_HEIGHT = 190
const CHART_PADDING_X = 30
const CHART_PADDING_Y = 22

export function getWeeklyVolumeState(volume: VolumeModel) {
  return volume.state
}

function chartPoints(volume: VolumeModel): string {
  const max = Math.max(...volume.weeklyVolume.map(point => point.volume), 1)
  const width = CHART_WIDTH - CHART_PADDING_X * 2
  const height = CHART_HEIGHT - CHART_PADDING_Y * 2
  return volume.weeklyVolume.map((point, index) => {
    const x = CHART_PADDING_X + (volume.weeklyVolume.length === 1 ? width / 2 : (index / (volume.weeklyVolume.length - 1)) * width)
    const y = CHART_PADDING_Y + ((max - point.volume) / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export default function WeeklyVolumeTrend({ volume }: { volume: VolumeModel }) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })

  return <section className={styles.detailSection} aria-labelledby="progression-volume-title">
    <div className={styles.detailHeading}>
      <div>
        <p className={styles.eyebrow}>{t('weeklyVolume.eyebrow')}</p>
        <h2 id="progression-volume-title">{t('weeklyVolume.title')}</h2>
        <p>{t('weeklyVolume.subtitle')}</p>
      </div>
    </div>

    {volume.state === 'loading' && <div className={styles.detailState} aria-busy="true" aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span>{t('states.loading')}</span>
    </div>}

    {volume.state === 'error' && <div className={styles.detailState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('weeklyVolume.unavailable')}</span>
    </div>}

    {volume.state === 'empty' && <div className={styles.detailState}>
      <strong>{t('states.insufficient')}</strong>
      <span>{t('weeklyVolume.empty')}</span>
    </div>}

    {(volume.state === 'ready' || volume.state === 'partial') && <>
      <div className={styles.volumeMetrics}>
        <div><span>{t('weeklyVolume.current')}</span><strong>{volume.currentWeek == null ? '—' : `${number.format(volume.currentWeek)} kg`}</strong></div>
        <div><span>{t('weeklyVolume.previous')}</span><strong>{volume.previousWeek == null ? '—' : `${number.format(volume.previousWeek)} kg`}</strong></div>
        <div><span>{t('weeklyVolume.change')}</span><strong>{volume.deltaPercent == null ? t('comparisonUnavailable') : `${volume.deltaPercent > 0 ? '+' : ''}${number.format(volume.deltaPercent)}%`}</strong></div>
      </div>
      {volume.weeklyVolume.length > 1 && <figure className={styles.volumeFigure}>
        <figcaption className={styles.srOnly}>{t('weeklyVolume.summary', { count: volume.weeklyVolume.length })}</figcaption>
        <svg className={styles.volumeChart} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-labelledby="progression-volume-chart-title">
          <title id="progression-volume-chart-title">{t('weeklyVolume.chartTitle')}</title>
          {[0.25, 0.5, 0.75].map(ratio => <line key={ratio} x1={CHART_PADDING_X} x2={CHART_WIDTH - CHART_PADDING_X} y1={CHART_HEIGHT * ratio} y2={CHART_HEIGHT * ratio} className={styles.chartGrid} />)}
          <polyline points={chartPoints(volume)} className={styles.performanceLine} />
        </svg>
        <div className={styles.chartDates}>
          <span>{volume.weeklyVolume[0]?.weekKey}</span>
          <span>{volume.weeklyVolume[volume.weeklyVolume.length - 1]?.weekKey}</span>
        </div>
        <p className={styles.chartSummary}>{t('weeklyVolume.definition')}</p>
      </figure>}
    </>}
  </section>
}
