import { useTranslations } from 'next-intl'
import type { WorkoutDraftExercise } from '@/lib/training/active-workout-draft'
import { bisetFor, techniqueIssue } from '@/lib/training/guided-techniques'
import { buildTechniqueBoard, type TechniqueBoardStep } from '@/lib/training/technique-board'
import styles from './TechniqueGuidance.module.css'

export default function TechniqueGuidance({ exercises, index, setIndex }: { exercises: WorkoutDraftExercise[]; index: number; setIndex: number }) {
  const t = useTranslations('trainingTechnique')
  const c = useTranslations('techniqueGuide')
  const exercise = exercises[index]
  const pair = bisetFor(exercises, index)
  const issue = techniqueIssue(exercises, index)
  if (issue) return <p role="alert">{issue === 'invalidRestPause' ? c('invalid') : t(issue)}</p>
  const board = buildTechniqueBoard(exercises, index, setIndex)
  if (!board) return null

  const stageCount = exercise.sets.filter(set => set.parentSetNumber).length
  const activeStage = exercise.sets.slice(0, setIndex + 1).filter(set => set.parentSetNumber).length
  const title = pair ? c('biset') : exercise.technique === 'restpause' ? c('restPause')
    : exercise.technique === 'fst7' ? 'FST-7'
      : exercise.technique === 'mechanical' ? c('mechanical') : 'DROP SET'

  function stepTitle(step: TechniqueBoardStep) {
    if (step.kind === 'fst7') return `FST-7 ${step.number}/${step.total}`
    const label = step.kind === 'mini' ? c('mini') : step.kind === 'drop' ? c('drop') : c('main')
    return `${label} ${step.number}/${step.total}`
  }

  function stepDetail(step: TechniqueBoardStep) {
    if (step.done) {
      const load = step.weight !== '' ? `${step.weight} kg` : null
      const reps = step.reps !== '' ? `${step.reps} ${c('reps').toLocaleLowerCase()}` : null
      return [load, reps].filter(Boolean).join(' · ') || c('done')
    }
    if (step.current) return c('now')
    return step.kind === 'drop' ? c('reduced') : `${step.targetReps} ${c('reps').toLocaleLowerCase()}`
  }

  return <section className={styles.board} aria-label={title}>
    <header className={styles.header}>
      <strong>{title}</strong>
      <span aria-label={`${board.completed}/${board.total}`}>{board.completed}/{board.total}</span>
    </header>
    {pair ? <p className={styles.instructions}>{t('bisetInstructions', { a: exercises[pair.a].name, b: exercises[pair.b].name, rest: exercises[pair.b].rest })}</p>
      : exercise.technique === 'dropset' ? <p className={styles.instructions}>{exercise.sets[setIndex]?.parentSetNumber
        ? t('dropNow', { stage: activeStage, count: stageCount })
        : t(stageCount === 1 ? 'dropPreparedOne' : 'dropPrepared', { count: stageCount, sets: exercise.sets.length - stageCount })}</p>
        : exercise.technique === 'restpause' ? <p className={styles.instructions}>{c('restPauseHelp')}</p>
          : exercise.technique === 'fst7' ? <p className={styles.instructions}>{t('fstInstructions', { reps: exercise.targetReps, rest: exercise.rest })}</p>
            : <p className={styles.instructions}>{c('mechanicalHelp')} {exercise.techniqueDetails || t('prescription')}</p>}

    <div className={styles.groups}>
      {board.groups.map(group => <article className={styles.group} key={group.exerciseIndex}>
        {group.side && <h3 className={styles.groupTitle}>{group.side} · {group.name}<span>{[...group.earlierMain, ...group.steps].filter(step => step.done).length}/{group.earlierMain.length + group.steps.length}</span></h3>}
        {group.earlierMain.length > 0 && <div className={styles.earlier} aria-label={c('main')}>
          <span>{c('main')}</span>
          <div>{group.earlierMain.map(step => <span key={step.key} className={styles.chip} data-state={step.done ? 'done' : step.current ? 'current' : 'upcoming'} aria-label={`${stepTitle(step)} · ${step.done ? c('done') : step.current ? c('now') : c('next')}`}>{step.number}</span>)}</div>
        </div>}
        <ol className={styles.steps} aria-label={group.side ? `${group.side} · ${group.name}` : title}>
          {group.steps.map(step => <li key={step.key} className={styles.step} data-state={step.done ? 'done' : step.current ? 'current' : 'upcoming'} aria-current={step.current ? 'step' : undefined}>
            <span className={styles.marker}>{step.done ? '✓' : step.number}</span>
            <span className={styles.stepText}><strong>{stepTitle(step)}</strong><small>{stepDetail(step)}</small></span>
            <span className={styles.state}>{step.done ? c('done') : step.current ? c('now') : c('next')}</span>
          </li>)}
        </ol>
      </article>)}
    </div>
  </section>
}
