import { useTranslations } from 'next-intl'
import type { TrainingProgramSource, TrainingProgramState } from '../../../lib/training/active-program'
import type { TodayTrainingKind } from '../../../lib/training/today-training-state'
import TrainingSessionHero from './TrainingSessionHero'
import styles from './TrainingV2.module.css'

interface NoActiveSessionProps {
  programState: TrainingProgramState
  programSource: TrainingProgramSource
  programName: string
  sessionName: string
  exerciseCount: number
  totalSets: number
  estimatedMinutes: number
  muscles: string[]
  isToday: boolean
  todayState: TodayTrainingKind | null
  completedSessionName: string | null
  canStart: boolean
  canViewNext: boolean
  onStart: () => void
  onViewNext: () => void
  onViewCompleted?: () => void
  onOpenProgramSettings: () => void
  onFreeSession: () => void
}

export default function NoActiveSession({
  programState,
  programSource,
  programName,
  sessionName,
  exerciseCount,
  totalSets,
  estimatedMinutes,
  muscles,
  isToday,
  todayState,
  completedSessionName,
  canStart,
  canViewNext,
  onStart,
  onViewNext,
  onViewCompleted,
  onOpenProgramSettings,
  onFreeSession,
}: NoActiveSessionProps) {
  const t = useTranslations('training_tab.v2')
  const sourceLabel = programSource === 'coach'
    ? t('coachPlan')
    : programSource === 'personal'
      ? t('personalProgram')
      : t('noProgram')
  const hasPlannedSession = exerciseCount > 0
  const isSettledEmpty = !hasPlannedSession && programState !== 'loading' && programState !== 'error'
  const programActionLabel = programState === 'loading' || programState === 'error'
    ? t('viewInAccount')
    : programSource === 'personal'
      ? t('manageInAccount')
      : programSource === 'coach'
        ? t('viewInAccount')
        : t('configureProgram')
  const stateTitle = programState === 'loading'
    ? t('programLoading')
    : programState === 'error'
      ? t('programError')
      : programState === 'empty'
        ? t('programEmpty')
        : hasPlannedSession
          ? sessionName
          : t('noSessionToday')
  const completedToday = isToday && todayState === 'completed'

  return (
    <div className={styles.landing} data-training-v2="no-active-session">
      {completedToday ? (
        <section className={`${styles.hero} ${styles.emptyHero}`} aria-labelledby="training-completed-title">
          <div className={styles.eyebrow}>{t('sessionCompletedLabel')}</div>
          <h1 id="training-completed-title" className={styles.emptyTitle}>{t('sessionCompletedToday')}</h1>
          {completedSessionName && <p className={styles.emptyDescription}>{completedSessionName}</p>}
          {onViewCompleted && <div className={`${styles.emptyActions} ${styles.emptyActionsSingle}`}>
            <button type="button" className={styles.secondaryAction} onClick={onViewCompleted}>{t('viewCompletedSession')}</button>
          </div>}
        </section>
      ) : hasPlannedSession ? <TrainingSessionHero
        mode="planned"
        title={stateTitle}
        exerciseCount={exerciseCount}
        totalSets={totalSets}
        estimatedMinutes={hasPlannedSession ? estimatedMinutes : undefined}
        muscles={hasPlannedSession ? muscles : []}
        plannedToday={isToday}
        disabled={!canStart}
        onAction={canStart ? onStart : undefined}
      /> : (
        <section className={`${styles.hero} ${styles.emptyHero}`} aria-labelledby="training-empty-title">
          <div className={styles.eyebrow}>{t('trainingLabel')}</div>
          <h1 id="training-empty-title" className={styles.emptyTitle}>{stateTitle}</h1>
          {isSettledEmpty && <p className={styles.emptyDescription}>{t('noSessionDescription')}</p>}
          {isSettledEmpty && (
            <div className={`${styles.emptyActions} ${canViewNext ? '' : styles.emptyActionsSingle}`}>
              {canViewNext && (
                <button type="button" className={styles.secondaryAction} onClick={onViewNext}>{t('viewNextSession')}</button>
              )}
              <button type="button" className={styles.toolAction} onClick={onFreeSession}>{t('freeSession')}</button>
            </div>
          )}
        </section>
      )}
      <section className={styles.summary} aria-labelledby="active-program-summary">
        <div>
          <div className={styles.sectionLabel}>{t('activeProgram')}</div>
          <h2 id="active-program-summary" className={styles.summaryTitle}>{programName || t('noProgram')}</h2>
          <div className={styles.sourceRow}>
            <span className={styles.sourceBadge}>{sourceLabel}</span>
            {totalSets > 0 && <span>{t('setCount', { count: totalSets })}</span>}
          </div>
        </div>
        <button type="button" className={styles.tertiaryAction} onClick={onOpenProgramSettings}>{programActionLabel}</button>
      </section>
      {hasPlannedSession && <div className={styles.secondaryTools}>
        <button type="button" className={styles.toolAction} onClick={onFreeSession}>{t('freeSession')}</button>
      </div>}
    </div>
  )
}
