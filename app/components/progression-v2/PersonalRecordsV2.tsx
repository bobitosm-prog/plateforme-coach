'use client'

import { Trophy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type RecordsModel = ProgressionViewModel['records']

const RECORD_TYPE_KEYS: Record<string, 'estimated1rm' | 'maxWeight' | 'maxReps' | 'bestVolume'> = {
  '1rm': 'estimated1rm',
  max_weight: 'maxWeight',
  max_reps: 'maxReps',
  best_volume: 'bestVolume',
  max_volume: 'bestVolume',
}

export function getPersonalRecordsState(records: RecordsModel) {
  return records.state
}

export function getRecordTypeKey(recordType: string) {
  return RECORD_TYPE_KEYS[recordType] ?? 'other'
}

function dateLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`))
}

export default function PersonalRecordsV2({ records }: { records: RecordsModel }) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()

  return <section id="progression-v2-records" className={styles.performanceCard} aria-labelledby="progression-records-title">
    <div className={styles.detailHeading}>
      <div>
        <p className={styles.eyebrow}>{t('records.eyebrow')}</p>
        <h2 id="progression-records-title">{t('records.title')}</h2>
        <p>{t('records.subtitle')}</p>
      </div>
    </div>

    {records.state === 'loading' && <div className={styles.detailState} aria-busy="true" aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span>{t('states.loading')}</span>
    </div>}

    {records.state === 'error' && <div className={styles.detailState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('records.unavailable')}</span>
    </div>}

    {records.state === 'empty' && <div className={styles.detailState}>
      <Trophy size={24} aria-hidden="true" />
      <strong>{t('records.emptyTitle')}</strong>
      <span>{t('records.empty')}</span>
    </div>}

    {(records.state === 'ready' || records.state === 'partial') && <div className={styles.recordGrid}>
      {records.items.map((record, index) => <article className={styles.recordCard} key={`${record.exerciseId ?? record.exerciseName}-${record.recordType}-${record.recordedAt ?? index}`}>
        <div className={styles.recordIcon}><Trophy size={17} aria-hidden="true" /></div>
        <div className={styles.recordContent}>
          <h3>{record.exerciseName}</h3>
          <strong>{record.value.toLocaleString(locale, { maximumFractionDigits: 1 })}{record.unit ? ` ${record.unit}` : ''}</strong>
          <span className={styles.recordType}>{t(`records.types.${getRecordTypeKey(record.recordType)}`)}</span>
          <time dateTime={record.recordedAt ?? undefined}>
            {record.recordedAt ? dateLabel(record.recordedAt, locale) : t('records.dateUnavailable')}
          </time>
        </div>
      </article>)}
    </div>}
  </section>
}
