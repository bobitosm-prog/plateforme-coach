import { useTranslations } from 'next-intl'
import styles from './TrainingV2.module.css'

export interface TimelineExercise {
  id: string
  name: string
  completedSets: number
  totalSets: number
}

export type TimelineExerciseState = 'done' | 'active' | 'upcoming'

export function getTimelineExerciseState(
  exercise: Pick<TimelineExercise, 'completedSets' | 'totalSets'>,
  index: number,
  activeIndex: number,
): TimelineExerciseState {
  if (exercise.totalSets > 0 && exercise.completedSets === exercise.totalSets) return 'done'
  if (index === activeIndex) return 'active'
  return 'upcoming'
}

interface SessionTimelineProps {
  exercises: TimelineExercise[]
  activeIndex: number
  onSelect: (index: number) => void
}

export default function SessionTimeline({ exercises, activeIndex, onSelect }: SessionTimelineProps) {
  const t = useTranslations('training_tab.v2')

  return (
    <nav className={styles.timeline} aria-label={t('timeline')}>
      <div className={styles.sectionLabel}>{t('timeline')}</div>
      <div className={styles.timelineList}>
        {exercises.map((exercise, index) => {
          const state = getTimelineExerciseState(exercise, index, activeIndex)
          const done = state === 'done'
          const active = state === 'active'
          return (
            <button
              key={exercise.id}
              type="button"
              className={styles.timelineButton}
              data-state={state}
              data-active={active}
              data-done={done}
              aria-current={active ? 'step' : undefined}
              aria-label={`${exercise.name}, ${t(state)}, ${exercise.completedSets}/${exercise.totalSets}`}
              onClick={() => onSelect(index)}
            >
              <span className={styles.timelineStatus} aria-hidden="true">{done ? '✓' : active ? '●' : index + 1}</span>
              <span className={styles.timelineName}>{exercise.name}</span>
              <span className={styles.timelineProgress}>{exercise.completedSets}/{exercise.totalSets}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
