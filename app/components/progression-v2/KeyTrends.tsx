'use client'

import { Activity, ArrowDown, ArrowUp, Dumbbell, Minus, Weight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  ProgressionDomainState,
  ProgressionTrend,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

function isFiniteNumber(value: number | null): value is number {
  return value != null && Number.isFinite(value)
}

function TrendIcon({ trend }: { trend: ProgressionTrend }) {
  if (trend === 'up') return <ArrowUp size={14} aria-hidden="true" />
  if (trend === 'down') return <ArrowDown size={14} aria-hidden="true" />
  return <Minus size={14} aria-hidden="true" />
}

function TrendState({ state }: { state: ProgressionDomainState }) {
  const t = useTranslations('progress.v2')
  if (state === 'loading') return <div className={styles.cardState} aria-live="polite"><span className={styles.skeleton} /><span>{t('states.loading')}</span></div>
  if (state === 'error') return <div className={styles.cardState} role="status"><strong>{t('states.unavailable')}</strong></div>
  if (state === 'empty') return <div className={styles.cardState}><strong>{t('states.insufficient')}</strong></div>
  return null
}

function TrendMeta({ trend, children }: { trend: ProgressionTrend; children: React.ReactNode }) {
  const t = useTranslations('progress.v2')
  return <span className={styles.trendMeta} data-trend={trend}>
    <TrendIcon trend={trend} />
    <span>{children}</span>
    <span className={styles.srOnly}>{t(`trend.${trend}`)}</span>
  </span>
}

export default function KeyTrends({ model }: { model: ProgressionViewModel }) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const weight = model.weight
  const regularity = model.regularity
  const volume = model.volume

  return <section className={styles.trends} aria-labelledby="progression-key-trends-title">
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{t('trends.eyebrow')}</p>
      <h2 id="progression-key-trends-title">{t('trends.title')}</h2>
      <p>{t('trends.subtitle')}</p>
    </div>

    <div className={styles.trendGrid}>
      <article className={styles.trendCard} aria-busy={weight.state === 'loading'} data-state={weight.state}>
        <div className={styles.cardHeader}><span className={styles.cardIcon}><Weight size={19} aria-hidden="true" /></span><span>{t('weight')}</span></div>
        <TrendState state={weight.state} />
        {(weight.state === 'ready' || weight.state === 'partial') && <>
          <strong className={styles.cardValue}>{isFiniteNumber(weight.current) ? `${number.format(weight.current)} ${t('units.kg')}` : '—'}</strong>
          {isFiniteNumber(weight.delta)
            ? <TrendMeta trend={weight.trend}>{t('weightChange', { value: `${weight.delta > 0 ? '+' : ''}${number.format(weight.delta)}`, period: t(`periods.${model.period.key}`) })}</TrendMeta>
            : <span className={styles.cardFallback}>{t('comparisonUnavailable')}</span>}
          {weight.state === 'partial' && <span className={styles.cardFallback}>{t('states.partial')}</span>}
        </>}
      </article>

      <article className={styles.trendCard} aria-busy={regularity.state === 'loading'} data-state={regularity.state}>
        <div className={styles.cardHeader}><span className={styles.cardIcon}><Activity size={19} aria-hidden="true" /></span><span>{t('regularity')}</span></div>
        <TrendState state={regularity.state} />
        {(regularity.state === 'ready' || regularity.state === 'partial') && <>
          <strong className={styles.cardValue}>{isFiniteNumber(regularity.averageCompleted) ? t('sessionsPerWeek', { value: number.format(regularity.averageCompleted) }) : '—'}</strong>
          <TrendMeta trend={regularity.trend}>{t('weeksWindow', { count: regularity.weeks.length })}</TrendMeta>
          {regularity.currentWeek?.planned == null && <span className={styles.cardFallback}>{t('plannedUnavailable')}</span>}
        </>}
      </article>

      <article className={styles.trendCard} aria-busy={volume.state === 'loading'} data-state={volume.state}>
        <div className={styles.cardHeader}><span className={styles.cardIcon}><Dumbbell size={19} aria-hidden="true" /></span><span>{t('volume')}</span></div>
        <TrendState state={volume.state} />
        {(volume.state === 'ready' || volume.state === 'partial') && <>
          <strong className={styles.cardValue}>{isFiniteNumber(volume.currentWeek) ? `${number.format(volume.currentWeek)} ${t('units.kg')}` : '—'}</strong>
          {isFiniteNumber(volume.deltaPercent)
            ? <TrendMeta trend={volume.deltaPercent > 0 ? 'up' : volume.deltaPercent < 0 ? 'down' : 'stable'}>{t('volumeChange', { value: `${volume.deltaPercent > 0 ? '+' : ''}${number.format(volume.deltaPercent)}` })}</TrendMeta>
            : <span className={styles.cardFallback}>{t('comparisonUnavailable')}</span>}
        </>}
      </article>
    </div>
  </section>
}
