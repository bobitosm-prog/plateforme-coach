'use client'

import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { MUSCLE_GROUPS_FILTER } from '../../../lib/design-tokens'
import { MUSCLE_KEY_MAP } from '../../../lib/i18n-muscle'
import type { ProgressionRecord, ProgressionViewModel } from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type RecordsModel = ProgressionViewModel['records']

const RECORD_TYPE_KEYS: Record<string, 'estimated1rm' | 'maxWeight' | 'maxReps' | 'bestVolume'> = {
  '1rm': 'estimated1rm',
  max_weight: 'maxWeight',
  max_reps: 'maxReps',
  best_volume: 'bestVolume',
  max_volume: 'bestVolume',
}

const MUSCLE_GROUP_ORDER = [...new Set(MUSCLE_GROUPS_FILTER
  .filter(group => group !== 'Tous')
  .flatMap(group => MUSCLE_KEY_MAP[group] ? [MUSCLE_KEY_MAP[group]] : []))]

export interface PersonalRecordMuscleGroup {
  muscleGroup: string
  records: ProgressionRecord[]
  count: number
}

export function getPersonalRecordsState(records: RecordsModel) {
  return records.state
}

export function getRecordTypeKey(recordType: string) {
  return RECORD_TYPE_KEYS[recordType] ?? 'other'
}

export function normalizeRecordMuscleGroup(muscleGroup: string | null | undefined): string {
  return muscleGroup ? MUSCLE_KEY_MAP[muscleGroup] ?? 'other' : 'other'
}

export function groupPersonalRecordsByMuscle(records: readonly ProgressionRecord[]): PersonalRecordMuscleGroup[] {
  const grouped = new Map<string, ProgressionRecord[]>()
  for (const record of records) {
    const muscleGroup = normalizeRecordMuscleGroup(record.muscleGroup)
    const current = grouped.get(muscleGroup) ?? []
    current.push(record)
    grouped.set(muscleGroup, current)
  }

  const order = new Map(MUSCLE_GROUP_ORDER.map((group, index) => [group, index]))
  return [...grouped.entries()].map(([muscleGroup, groupRecords]) => {
    const sortedRecords = [...groupRecords].sort((a, b) => (
      a.exerciseName.localeCompare(b.exerciseName)
      || a.recordType.localeCompare(b.recordType)
      || (b.recordedAt ?? '').localeCompare(a.recordedAt ?? '')
    ))
    return { muscleGroup, records: sortedRecords, count: sortedRecords.length }
  }).sort((a, b) => (
    (order.get(a.muscleGroup) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.muscleGroup) ?? Number.MAX_SAFE_INTEGER)
    || a.muscleGroup.localeCompare(b.muscleGroup)
  ))
}

function dateLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`))
}

function recordValue(record: ProgressionRecord, locale: string): string {
  return `${record.value.toLocaleString(locale, { maximumFractionDigits: 1 })}${record.unit ? ` ${record.unit}` : ''}`
}

function RecordRow({ record }: { record: ProgressionRecord }) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  return <article className={styles.recordRow}>
    <div className={styles.recordRowMain}>
      <h3>{record.exerciseName}</h3>
      <span>{t(`records.types.${getRecordTypeKey(record.recordType)}`)}</span>
      <time dateTime={record.recordedAt ?? undefined}>
        {record.recordedAt ? dateLabel(record.recordedAt, locale) : t('records.dateUnavailable')}
      </time>
    </div>
    <strong>{recordValue(record, locale)}</strong>
  </article>
}

export default function PersonalRecordsV2({ records }: { records: RecordsModel }) {
  const t = useTranslations('progress.v2')
  const tMuscle = useTranslations('muscles')
  const locale = useLocale()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [showAllGroup, setShowAllGroup] = useState<string | null>(null)
  const groups = groupPersonalRecordsByMuscle(records.items)

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

    {(records.state === 'ready' || records.state === 'partial') && <div className={styles.recordGroupGrid} aria-label={t('records.muscleGroupsLabel')}>
      {groups.map((group, groupIndex) => {
        const isOpen = openGroup === group.muscleGroup
        const showAll = showAllGroup === group.muscleGroup
        const visibleRecords = showAll ? group.records : group.records.slice(0, 3)
        const hiddenCount = group.count - visibleRecords.length
        const contentId = `progression-record-group-${groupIndex}`
        const groupLabel = group.muscleGroup === 'other' ? t('records.otherGroup') : tMuscle(group.muscleGroup)
        const representative = group.records[0]

        return <section className={styles.recordGroup} key={group.muscleGroup} data-open={isOpen}>
          <button
            type="button"
            className={styles.recordGroupToggle}
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={() => {
              setOpenGroup(current => current === group.muscleGroup ? null : group.muscleGroup)
              setShowAllGroup(null)
            }}
          >
            <span className={styles.recordGroupHeading}>
              <strong>{groupLabel}</strong>
              <span>{t('records.recordCount', { count: group.count })}</span>
              {representative && <small>{representative.exerciseName} · {recordValue(representative, locale)}</small>}
            </span>
            <ChevronDown size={18} aria-hidden="true" data-open={isOpen} />
          </button>

          {isOpen && <div id={contentId} className={styles.recordGroupContent}>
            <div className={styles.recordRows}>{visibleRecords.map((record, index) => <RecordRow
              key={`${record.exerciseId ?? record.exerciseName}-${record.recordType}-${record.recordedAt ?? index}`}
              record={record}
            />)}</div>
            {group.count > 3 && <button
              type="button"
              className={styles.recordMoreButton}
              onClick={() => setShowAllGroup(showAll ? null : group.muscleGroup)}
            >{showAll ? t('records.collapse') : t('records.showMore', { count: hiddenCount })}</button>}
          </div>}
        </section>
      })}
    </div>}
  </section>
}
