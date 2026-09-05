'use client'

import { ArrowDown, ArrowUp, Minus, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  ProgressionDomainState,
  ProgressionPeriod,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

const PERIODS: ProgressionPeriod[] = ['7d', '30d', '90d', 'all']

export function getProgressionHeroState(model: ProgressionViewModel): ProgressionDomainState {
  return model.summary.state
}

function isFiniteNumber(value: number | null): value is number {
  return value != null && Number.isFinite(value)
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUp size={15} aria-hidden="true" />
  if (value < 0) return <ArrowDown size={15} aria-hidden="true" />
  return <Minus size={15} aria-hidden="true" />
}

export default function ProgressionHero({
  model,
  onPeriodChange,
  onAddMeasurement,
}: {
  model: ProgressionViewModel
  onPeriodChange: (period: ProgressionPeriod) => void
  onAddMeasurement: () => void
}) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const state = getProgressionHeroState(model)
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: model.freshness.timezone })
  const currentWeight = model.summary.currentWeight
  const weightDelta = model.summary.weightDelta
  const averageSessions = model.regularity.averageCompleted
  const volumeDelta = model.summary.volumeDeltaPercent

  return <header className={styles.hero} aria-labelledby="progression-v2-title" aria-busy={state === 'loading'} data-state={state}>
    <div className={styles.heroTop}>
      <div className={styles.heroHeading}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 id="progression-v2-title" className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </div>
      <button type="button" className={styles.primaryButton} onClick={onAddMeasurement}>
        <Plus size={17} aria-hidden="true" /> {t('addMeasurement')}
      </button>
    </div>

    <div className={styles.periodBlock}>
      <span className={styles.periodLabel}>{t('periodLabel')}</span>
      <div className={styles.periodSelector} role="group" aria-label={t('periodLabel')}>
        {PERIODS.map(period => <button
          key={period}
          type="button"
          className={styles.periodButton}
          aria-pressed={model.period.key === period}
          onClick={() => onPeriodChange(period)}
        >{t(`periods.${period}`)}</button>)}
      </div>
      {model.period.key === 'all' && model.period.isTruncated && model.period.availableFrom && <p className={styles.availability}>
        {t('availableSince', { date: date.format(new Date(`${model.period.availableFrom}T12:00:00Z`)) })}
      </p>}
    </div>

    {state === 'loading' && <div className={styles.heroState} aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span className={styles.srOnly}>{t('states.loading')}</span>
    </div>}

    {state === 'error' && <div className={styles.heroState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('states.unavailableCopy')}</span>
    </div>}

    {state === 'empty' && <div className={styles.heroState}>
      <strong>{t('states.insufficient')}</strong>
      <span>{t('states.insufficientCopy')}</span>
    </div>}

    {(state === 'ready' || state === 'partial') && <div className={styles.heroSummary}>
      <div className={styles.heroPrimaryMetric}>
        <span>{t('currentWeight')}</span>
        <strong>{isFiniteNumber(currentWeight) ? `${number.format(currentWeight)} ${t('units.kg')}` : '—'}</strong>
        {isFiniteNumber(weightDelta) && <small>
          <TrendIcon value={weightDelta} />
          {t('weightChange', {
            value: `${weightDelta > 0 ? '+' : ''}${number.format(weightDelta)}`,
            period: t(`periods.${model.period.key}`),
          })}
        </small>}
      </div>
      <div className={styles.heroSupportingMetrics}>
        {isFiniteNumber(averageSessions) && <div>
          <span>{t('regularity')}</span>
          <strong>{t('sessionsPerWeek', { value: number.format(averageSessions) })}</strong>
        </div>}
        {isFiniteNumber(volumeDelta) && <div>
          <span>{t('volume')}</span>
          <strong>{t('volumeChange', { value: `${volumeDelta > 0 ? '+' : ''}${number.format(volumeDelta)}` })}</strong>
        </div>}
      </div>
      {state === 'partial' && <p className={styles.partialNotice}>{t('states.partial')}</p>}
    </div>}
  </header>
}
