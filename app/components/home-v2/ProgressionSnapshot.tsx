'use client'

import { ArrowDown, ArrowRight, ArrowUp, Dumbbell, Gauge, Minus, Trophy, Weight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { HomeViewModel } from '../../../lib/home/home-dashboard-model'
import styles from './HomeV2.module.css'

export type ProgressionSnapshotState = 'loading' | 'error' | 'empty' | 'partial' | 'complete'
export type WeightTrendDirection = 'up' | 'down' | 'stable' | 'unknown'

function isFiniteNumber(value: number | null): value is number {
  return value != null && Number.isFinite(value)
}

export function resolveWeightTrendDirection(trend: number | null): WeightTrendDirection {
  if (!isFiniteNumber(trend)) return 'unknown'
  if (trend > 0) return 'up'
  if (trend < 0) return 'down'
  return 'stable'
}

export function resolveProgressionSnapshotState(
  progression: HomeViewModel['progression'],
): ProgressionSnapshotState {
  if (progression.state === 'loading') return 'loading'
  if (progression.state === 'error') return 'error'
  if (progression.state === 'empty') return 'empty'

  const availableMetrics = [
    isFiniteNumber(progression.currentWeight) && progression.currentWeight > 0,
    isFiniteNumber(progression.sessionsThisWeek) && progression.sessionsThisWeek >= 0,
    isFiniteNumber(progression.adherence) && progression.adherence >= 0 && progression.adherence <= 1,
    progression.latestPR != null,
  ].filter(Boolean).length

  if (availableMetrics === 0) return 'empty'
  return availableMetrics >= 3 ? 'complete' : 'partial'
}

export default function ProgressionSnapshot({
  progression,
  onOpenProgression,
}: {
  progression: HomeViewModel['progression']
  onOpenProgression?: () => void
}) {
  const t = useTranslations('home.v2.progression')
  const locale = useLocale()
  const state = resolveProgressionSnapshotState(progression)
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const trendDirection = resolveWeightTrendDirection(progression.weightTrend)
  const recordImprovement = progression.latestPR?.value != null && progression.latestPR.previousValue != null
    ? progression.latestPR.value - progression.latestPR.previousValue
    : null

  const trendIcon = trendDirection === 'up'
    ? <ArrowUp size={14} aria-hidden="true" />
    : trendDirection === 'down'
      ? <ArrowDown size={14} aria-hidden="true" />
      : <Minus size={14} aria-hidden="true" />

  return <section className={styles.progression} aria-labelledby="progression-snapshot-title" aria-busy={state === 'loading'} data-state={state}>
    <div className={styles.progressionHeader}>
      <div>
        <p className={styles.progressionEyebrow}>{t('eyebrow')}</p>
        <h2 id="progression-snapshot-title" className={styles.progressionTitle}>{t('title')}</h2>
        {(state === 'partial' || state === 'complete') && <p className={styles.progressionCopy}>{t(`${state}Copy`)}</p>}
      </div>
      {(state === 'partial' || state === 'complete') && <button type="button" className={styles.progressionLink} onClick={onOpenProgression}>
        {t('cta')} <ArrowRight size={15} aria-hidden="true" />
      </button>}
    </div>

    {state === 'loading' && <div className={styles.progressionState} aria-live="polite">
      <div className={`${styles.skeletonLine} ${styles.progressionSkeleton}`} />
      <span>{t('loading')}</span>
    </div>}

    {state === 'error' && <div className={styles.progressionState} role="status">
      <strong>{t('errorTitle')}</strong><span>{t('errorCopy')}</span>
    </div>}

    {state === 'empty' && <div className={styles.progressionState}>
      <strong>{t('emptyTitle')}</strong><span>{t('emptyCopy')}</span>
      <button type="button" className={styles.progressionLink} onClick={onOpenProgression}>{t('cta')} <ArrowRight size={15} aria-hidden="true" /></button>
    </div>}

    {(state === 'partial' || state === 'complete') && <div className={styles.progressionGrid}>
      {isFiniteNumber(progression.currentWeight) && progression.currentWeight > 0 && <article className={styles.progressionMetric}>
        <span className={styles.progressionIcon}><Weight size={18} aria-hidden="true" /></span>
        <span className={styles.progressionMetricLabel}>{t('weight')}</span>
        <strong className={styles.progressionMetricValue}>{number.format(progression.currentWeight)} kg</strong>
        <span className={styles.progressionMetricMeta} data-trend={trendDirection}>
          {trendIcon}
          {trendDirection === 'unknown'
            ? t('trendUnknown')
            : t(`trend.${trendDirection}`, { value: number.format(Math.abs(progression.weightTrend ?? 0)) })}
        </span>
      </article>}

      {isFiniteNumber(progression.sessionsThisWeek) && progression.sessionsThisWeek >= 0 && <article className={styles.progressionMetric}>
        <span className={styles.progressionIcon}><Dumbbell size={18} aria-hidden="true" /></span>
        <span className={styles.progressionMetricLabel}>{t('sessionsLabel')}</span>
        <strong className={styles.progressionMetricValue}>{t('sessions', { count: progression.sessionsThisWeek })}</strong>
      </article>}

      {isFiniteNumber(progression.adherence) && progression.adherence >= 0 && progression.adherence <= 1 && <article className={styles.progressionMetric}>
        <span className={styles.progressionIcon}><Gauge size={18} aria-hidden="true" /></span>
        <span className={styles.progressionMetricLabel}>{t('adherence')}</span>
        <strong className={styles.progressionMetricValue}>{Math.round(progression.adherence * 100)}%</strong>
      </article>}

      {progression.latestPR && <article className={styles.progressionMetric}>
        <span className={styles.progressionIcon}><Trophy size={18} aria-hidden="true" /></span>
        <span className={styles.progressionMetricLabel}>{t('latestPR')}</span>
        <strong className={styles.progressionMetricValue}>{progression.latestPR.exerciseName}</strong>
        {progression.latestPR.value != null && <span className={styles.progressionMetricMeta}>
          {number.format(progression.latestPR.value)}{progression.latestPR.unit ? ` ${progression.latestPR.unit}` : ''}
          {recordImprovement != null && recordImprovement > 0
            ? ` · ${t('recordGain', { value: number.format(recordImprovement) })}${progression.latestPR.unit ? ` ${progression.latestPR.unit}` : ''}`
            : ''}
        </span>}
      </article>}
    </div>}
  </section>
}
