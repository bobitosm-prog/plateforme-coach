import { useTranslations } from 'next-intl'
import type { WorkoutDraftExercise } from '@/lib/training/active-workout-draft'
import { bisetFor, techniqueIssue } from '@/lib/training/guided-techniques'

export default function TechniqueGuidance({ exercises, index, setIndex }: { exercises: WorkoutDraftExercise[]; index: number; setIndex: number }) {
  const t = useTranslations('trainingTechnique')
  const ex = exercises[index], set = ex.sets[setIndex]
  const pair = bisetFor(exercises, index)
  const issue = techniqueIssue(exercises, index)
  if (issue) return <p role="alert">{t(issue)}</p>
  if (pair) return <div role="note"><strong>{t('bisetTitle', { side: index === pair.a ? 'A' : 'B' })}</strong><p>{t('bisetInstructions', { a: exercises[pair.a].name, b: exercises[pair.b].name, rest: exercises[pair.b].rest })}</p></div>
  if (ex.technique !== 'dropset') return null
  const count = ex.sets.filter(s => s.parentSetNumber).length
  const stage = ex.sets.slice(0, setIndex + 1).filter(s => s.parentSetNumber).length
  return <div role="note"><strong>DROP SET</strong><p>{set?.parentSetNumber ? t('dropNow', { stage, count }) : t('dropPrepared', { count, sets: ex.sets.length - count })}</p></div>
}
