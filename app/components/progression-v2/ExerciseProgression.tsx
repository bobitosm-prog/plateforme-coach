'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import type {
  ProgressionExerciseSeries,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'
import InteractiveTrend from './InteractiveTrend'

type ExerciseModel = ProgressionViewModel['exerciseProgress']

export function getExerciseProgressionState(exerciseProgress: ExerciseModel) {
  return exerciseProgress.state
}

export function getExerciseMetricKey(metric: ProgressionExerciseSeries['metric']) {
  if (metric === 'max_weight') return 'maxWeight'
  if (metric === 'volume') return 'volume'
  return 'estimated1rm'
}

function exerciseKey(exercise: ProgressionExerciseSeries): string {
  return `${exercise.exerciseId ?? exercise.exerciseName}:${exercise.loadMode ?? 'legacy'}`
}

export default function ExerciseProgression({ exerciseProgress }: { exerciseProgress: ExerciseModel }) {
  const t = useTranslations('progress.v2')
  const tLoad = useTranslations('trainingLoad')
  const [selectedKey, setSelectedKey] = useState('')
  const exercises = exerciseProgress.exercises

  const selected = useMemo(
    () => exercises.find(exercise => exerciseKey(exercise) === selectedKey) ?? exercises[0] ?? null,
    [exercises, selectedKey],
  )
  const metricKey = selected ? getExerciseMetricKey(selected.metric) : 'estimated1rm'

  return <section className={styles.performanceCard} aria-labelledby="progression-exercise-title">
    <div className={styles.detailHeading}>
      <div>
        <p className={styles.eyebrow}>{t('exercise.eyebrow')}</p>
        <h2 id="progression-exercise-title">{t('exercise.title')}</h2>
        <p>{t('exercise.subtitle')}</p>
      </div>
    </div>

    {exerciseProgress.state === 'loading' && <div className={styles.detailState} aria-busy="true" aria-live="polite">
      <span className={`${styles.skeleton} ${styles.skeletonWide}`} />
      <span className={styles.skeleton} />
      <span>{t('states.loading')}</span>
    </div>}

    {exerciseProgress.state === 'error' && <div className={styles.detailState} role="status">
      <strong>{t('states.unavailable')}</strong>
      <span>{t('exercise.unavailable')}</span>
    </div>}

    {exerciseProgress.state === 'empty' && <div className={styles.detailState}>
      <strong>{t('states.insufficient')}</strong>
      <span>{t('exercise.empty')}</span>
    </div>}

    {(exerciseProgress.state === 'ready' || exerciseProgress.state === 'partial') && selected && <>
      <label className={styles.selectorLabel} htmlFor="progression-exercise-selector">{t('exercise.selectorLabel')}</label>
      <select
        id="progression-exercise-selector"
        className={styles.exerciseSelector}
        value={exerciseKey(selected)}
        onChange={event => setSelectedKey(event.target.value)}
      >
        {exercises.map(exercise => <option key={exerciseKey(exercise)} value={exerciseKey(exercise)}>{exercise.exerciseName} — {tLoad(exercise.loadMode ?? 'legacy')}</option>)}
      </select>

      <InteractiveTrend key={exerciseKey(selected)} points={selected.series} unit="kg" title={t(`exercise.metrics.${metricKey}`)} />
    </>}
  </section>
}
