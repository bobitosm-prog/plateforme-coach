import { Dumbbell } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { TrainingProgramSource, TrainingProgramState } from '../../../lib/training/active-program'
import type { TodayTrainingKind } from '../../../lib/training/today-training-state'
import TrainingSessionHero from './TrainingSessionHero'
import styles from './TrainingV2.module.css'
import homeStyles from '../home-v2/HomeV2.module.css'

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
  onStart: () => void
  onViewCompleted?: () => void
  onOpenProgramSettings: () => void
  onFreeSession: () => void
  children?: ReactNode
}

export default function NoActiveSession({
  programState,
  programSource,
  sessionName,
  exerciseCount,
  totalSets,
  estimatedMinutes,
  muscles,
  isToday,
  todayState,
  completedSessionName,
  canStart,
  onStart,
  onViewCompleted,
  onOpenProgramSettings,
  onFreeSession,
  children,
}: NoActiveSessionProps) {
  const t = useTranslations('training_tab.v2')
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
  // The overview always describes today, even when the calendar is browsing another day.
  const completedToday = todayState === 'completed'

  return (
    <div className={styles.landing} data-training-v2="no-active-session">
      <header className={styles.overviewHeader}>
        <h1 className={homeStyles.title}>{t('pageTitleLead')}{' '}<br /><em>{t('pageTitleAccent')}</em></h1>
      </header>
      <div className={styles.journeyTimeline} data-training-journey="true">
      <div className={`${styles.journeyStep} ${completedToday ? styles.journeyStepCompleted : ''}`}>
      {completedToday ? (
        <section className={`${styles.hero} ${styles.emptyHero}`} aria-labelledby="training-completed-title">
          <div className={styles.eyebrow}><Dumbbell size={24} aria-hidden="true" />{t('sessionCompletedLabel')}</div>
          <h2 id="training-completed-title" className={styles.emptyTitle}>{completedSessionName || t('sessionCompletedToday')}</h2>
          {completedSessionName && <p className={styles.emptyDescription}>{t('sessionCompletedToday')}</p>}
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
          <div className={styles.eyebrow}><Dumbbell size={24} aria-hidden="true" />{t('sessionToday')}</div>
          <h2 id="training-empty-title" className={styles.emptyTitle}>{stateTitle}</h2>
          {isSettledEmpty && <p className={styles.emptyDescription}>{t('noSessionDescription')}</p>}
          {isSettledEmpty && (
            <div className={`${styles.emptyActions} ${styles.emptyActionsSingle}`}>
              <button type="button" className={styles.toolAction} onClick={onFreeSession}>{t('freeSession')}</button>
            </div>
          )}
        </section>
      )}
        <div className={styles.secondaryTools}>
          <button type="button" className={styles.tertiaryAction} onClick={onOpenProgramSettings}>{programActionLabel}</button>
          {hasPlannedSession && <button type="button" className={styles.toolAction} onClick={onFreeSession}>{t('freeSession')}</button>}
        </div>
      </div>
      {children && <div className={styles.journeyStep}>{children}</div>}
      </div>

    </div>
  )
}
