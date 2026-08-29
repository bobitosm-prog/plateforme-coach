import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

interface TrainingSessionHeroProps {
  mode: 'planned' | 'active'
  title: string
  exerciseCount: number
  completedExercises?: number
  totalSets: number
  completedSets?: number
  elapsed?: string
  estimatedMinutes?: number
  muscles?: string[]
  plannedToday?: boolean
  disabled?: boolean
  onAction?: () => void
}

export default function TrainingSessionHero({
  mode,
  title,
  exerciseCount,
  completedExercises = 0,
  totalSets,
  completedSets = 0,
  elapsed,
  estimatedMinutes,
  muscles = [],
  plannedToday = true,
  disabled,
  onAction,
}: TrainingSessionHeroProps) {
  const t = useTranslations('training_tab.v2')
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
  const hasPlannedExercises = mode === 'active' || exerciseCount > 0

  return (
    <section className={styles.hero} aria-labelledby={`training-${mode}-title`}>
      <div className={styles.eyebrow}>
        {mode === 'active'
          ? t('sessionActive')
          : hasPlannedExercises
            ? plannedToday ? t('sessionToday') : t('nextSession')
            : t('trainingLabel')}
      </div>
      <h1 id={`training-${mode}-title`} className={styles.heroTitle}>{title}</h1>
      {hasPlannedExercises && <div className={styles.heroMeta} aria-label={t('sessionSummary')}>
        {mode === 'active' ? (
          <>
            <span>{t('exerciseProgress', { current: completedExercises, total: exerciseCount })}</span>
            <span>{t('setProgress', { current: completedSets, total: totalSets })}</span>
            {elapsed && <span>{elapsed}</span>}
          </>
        ) : (
          <>
            <span>{t('exerciseCount', { count: exerciseCount })}</span>
            {estimatedMinutes != null && estimatedMinutes > 0 && <span>{t('estimatedDuration', { minutes: estimatedMinutes })}</span>}
          </>
        )}
      </div>}
      {mode === 'planned' && hasPlannedExercises && muscles.length > 0 && (
        <div className={styles.heroMuscles}>{muscles.slice(0, 3).join(' · ')}</div>
      )}
      {mode === 'active' && (
        <>
          <div className={styles.metricRow} aria-hidden="true">
            <div className={styles.metric}>
              <span className={styles.metricValue}>{completedExercises}/{exerciseCount}</span>
              <span className={styles.metricLabel}>{t('exercises')}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>{completedSets}/{totalSets}</span>
              <span className={styles.metricLabel}>{t('sets')}</span>
            </div>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </>
      )}
      {onAction && (
        <button type="button" className={styles.primaryAction} onClick={onAction} disabled={disabled}>
          {mode === 'active' ? t('resume') : t('start')}
        </button>
      )}
    </section>
  )
}
