import { useState } from 'react'
import { CalendarDays, ChevronRight, Dumbbell, Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { NextPlannedSession } from '../../../lib/training/next-planned-session'
import styles from './TrainingV2.module.css'

function exerciseName(exercise: Record<string, unknown>): string {
  for (const key of ['exercise_name', 'custom_name', 'name']) {
    const value = exercise[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return '—'
}

export default function NextPlannedSessionCard({
  session,
  editable,
  onView,
  onEdit,
}: {
  session: NextPlannedSession
  editable: boolean
  onView: () => void
  onEdit: () => void
}) {
  const t = useTranslations('training_tab.v2')
  const locale = useLocale()
  const [showAllExercises, setShowAllExercises] = useState(false)
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(session.date)
  const visibleExercises = showAllExercises ? session.exercises : session.exercises.slice(0, 4)

  return <section className={styles.nextSessionCard} aria-labelledby="training-next-session-title" data-training-section-card="next-session">
    <div className={styles.nextSessionHeading}>
      <div>
        <p className={styles.nextSessionEyebrow}>{t('nextSession')}</p>
        <h2 id="training-next-session-title" className={styles.nextSessionTitle}>{session.title}</h2>
        <p className={styles.nextSessionDate}><CalendarDays size={15} aria-hidden="true" />{date}</p>
      </div>
      <span className={styles.nextSessionIcon} aria-hidden="true"><Dumbbell size={22} /></span>
    </div>
    <h3 className={styles.nextSessionListTitle}>{t('plannedExercises', { count: session.exercises.length })}</h3>
    <ol className={styles.nextSessionList}>
      {visibleExercises.map((exercise, index) => <li key={`${index}-${exerciseName(exercise)}`}>
        <span className={styles.nextSessionNumber}>{index + 1}</span>
        <span className={styles.nextSessionExercise}>
          <strong>{exerciseName(exercise)}</strong>
          {Number(exercise.sets) > 0 && <small>{t('setCount', { count: Number(exercise.sets) })}{exercise.reps != null ? ` · ${String(exercise.reps)} ${t('repsShort')}` : ''}</small>}
        </span>
      </li>)}
    </ol>
    {session.exercises.length > 4 && <button type="button" className={styles.nextSessionMore} aria-expanded={showAllExercises} onClick={() => setShowAllExercises(value => !value)}>
      {showAllExercises ? t('showFewerExercises') : t('showAllExercises', { count: session.exercises.length })}
    </button>}
    <div className={styles.nextSessionActions}>
      <button type="button" onClick={onView} className={styles.nextSessionView}>
        {t('viewOnCalendar')} <ChevronRight size={16} aria-hidden="true" />
      </button>
      {editable ? <button type="button" onClick={onEdit} className={styles.nextSessionEdit}>
        <Pencil size={16} aria-hidden="true" /> {t('editSessionOrder')}
      </button> : <p className={styles.nextSessionReadOnly}>{t('coachSessionReadOnly')}</p>}
    </div>
  </section>
}
