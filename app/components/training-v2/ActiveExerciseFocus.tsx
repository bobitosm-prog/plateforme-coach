import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface ActiveExerciseFocusProps {
  name: string
  exerciseIndex: number
  exerciseCount: number
  activeSet: number
  totalSets: number
  previous: string | null
  previousError: boolean
  target: string
  children: ReactNode
}

export default function ActiveExerciseFocus({
  name,
  exerciseIndex,
  exerciseCount,
  activeSet,
  totalSets,
  previous,
  previousError,
  target,
  children,
}: ActiveExerciseFocusProps) {
  const t = useTranslations('training_tab.v2')
  const previousLabel = previousError ? t('previousError') : previous || t('noPrevious')

  return (
    <main className={styles.focus} aria-labelledby="active-exercise-title">
      <div className={styles.focusLabel}>{t('focus')}</div>
      <h2 id="active-exercise-title" className={styles.focusHeading}>{name}</h2>
      <div className={styles.focusMeta}>
        <span>{t('exerciseProgress', { current: exerciseIndex + 1, total: exerciseCount })}</span>
        <span>{t('setProgress', { current: activeSet, total: totalSets })}</span>
      </div>
      <div className={styles.focusStats}>
        <div className={styles.focusStat}>
          <span className={styles.metricLabel}>{t('previous')}</span>
          <strong>{previousLabel}</strong>
        </div>
        <div className={styles.focusStat}>
          <span className={styles.metricLabel}>{t('target')}</span>
          <strong>{target}</strong>
        </div>
      </div>
      <div className={styles.focusBody} data-training-v2-logger="primary">{children}</div>
    </main>
  )
}
