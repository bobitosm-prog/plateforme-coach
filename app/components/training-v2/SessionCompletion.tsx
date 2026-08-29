'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, Trophy } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { getExerciseName } from '../../../lib/i18n-exercise'
import styles from './TrainingV2.module.css'

interface CompletionRecord {
  exercise: string
  value: number
}

interface SessionCompletionProps {
  sessionName: string
  duration: string
  completedSets: number
  completedExercises: number
  records: CompletionRecord[]
  onGoHome: () => void
  onGoProgress: () => void
}

export default function SessionCompletion({
  sessionName,
  duration,
  completedSets,
  completedExercises,
  records,
  onGoHome,
  onGoProgress,
}: SessionCompletionProps) {
  const t = useTranslations('training_tab.ws.done')
  const locale = useLocale() as 'fr' | 'en' | 'de'
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className={styles.completionShell} aria-labelledby="training-completion-title">
      <section className={styles.completionCard} role="status" aria-live="polite">
        <CheckCircle2 className={styles.completionIcon} aria-hidden="true" />
        <h1 id="training-completion-title" ref={headingRef} tabIndex={-1}>{t('title')}</h1>
        <p className={styles.completionSessionName}>{sessionName}</p>

        <dl className={styles.completionMetrics}>
          <div><dt>{t('duration')}</dt><dd>{duration}</dd></div>
          <div><dt>{t('sets')}</dt><dd>{completedSets}</dd></div>
          <div><dt>{t('exercises')}</dt><dd>{completedExercises}</dd></div>
        </dl>

        {records.length > 0 && (
          <section className={styles.completionRecords} aria-labelledby="training-records-title">
            <div className={styles.completionRecordsHeading}>
              <Trophy size={18} aria-hidden="true" />
              <h2 id="training-records-title">{t('newRecord')}</h2>
            </div>
            {records.map(record => (
              <div key={`${record.exercise}-${record.value}`} className={styles.completionRecord}>
                <span>{getExerciseName({ name: record.exercise }, locale)}</span>
                <strong>{record.value} kg</strong>
              </div>
            ))}
          </section>
        )}

        <div className={styles.completionActions}>
          <button type="button" className={styles.completionPrimaryAction} onClick={onGoHome}>{t('backHome')}</button>
          <button type="button" className={styles.completionSecondaryAction} onClick={onGoProgress}>{t('viewProgress')}</button>
        </div>
      </section>
    </main>
  )
}
