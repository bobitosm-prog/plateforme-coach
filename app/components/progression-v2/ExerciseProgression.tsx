'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type {
  ProgressionExerciseSeries,
  ProgressionViewModel,
} from '../../../lib/progression/progression-dashboard-model'
import styles from './ProgressionV2.module.css'

type ExerciseModel = ProgressionViewModel['exerciseProgress']

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const CHART_PADDING_X = 36
const CHART_PADDING_Y = 26

export function getExerciseProgressionState(exerciseProgress: ExerciseModel) {
  return exerciseProgress.state
}

export function getExerciseMetricKey(metric: ProgressionExerciseSeries['metric']) {
  if (metric === 'max_weight') return 'maxWeight'
  if (metric === 'volume') return 'volume'
  return 'estimated1rm'
}

function exerciseKey(exercise: ProgressionExerciseSeries): string {
  return exercise.exerciseId ?? exercise.exerciseName
}

function dateLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Zurich',
  }).format(new Date(`${date}T12:00:00Z`))
}

function chartGeometry(series: ProgressionExerciseSeries['series']) {
  const values = series.map(point => point.value)
  const rawMin = values.length ? Math.min(...values) : 0
  const rawMax = values.length ? Math.max(...values) : 1
  const padding = Math.max((rawMax - rawMin) * 0.15, 1)
  const min = rawMin - padding
  const max = rawMax + padding
  const range = max - min || 1
  const width = CHART_WIDTH - CHART_PADDING_X * 2
  const height = CHART_HEIGHT - CHART_PADDING_Y * 2
  return {
    min,
    max,
    points: series.map((point, index) => {
      const x = CHART_PADDING_X + (series.length === 1 ? width / 2 : (index / (series.length - 1)) * width)
      const y = CHART_PADDING_Y + ((max - point.value) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' '),
  }
}

export default function ExerciseProgression({ exerciseProgress }: { exerciseProgress: ExerciseModel }) {
  const t = useTranslations('progress.v2')
  const locale = useLocale()
  const [selectedKey, setSelectedKey] = useState('')
  const exercises = exerciseProgress.exercises

  const selected = useMemo(
    () => exercises.find(exercise => exerciseKey(exercise) === selectedKey) ?? exercises[0] ?? null,
    [exercises, selectedKey],
  )
  const chart = chartGeometry(selected?.series ?? [])
  const first = selected?.series[0] ?? null
  const last = selected?.series[selected.series.length - 1] ?? null
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
        {exercises.map(exercise => <option key={exerciseKey(exercise)} value={exerciseKey(exercise)}>{exercise.exerciseName}</option>)}
      </select>

      {selected.series.length > 1 ? <figure className={styles.exerciseFigure}>
        <figcaption className={styles.srOnly}>{t('exercise.summary', {
          exercise: selected.exerciseName,
          metric: t(`exercise.metrics.${metricKey}`),
          start: first?.value ?? '—',
          end: last?.value ?? '—',
          count: selected.series.length,
        })}</figcaption>
        <div className={styles.chartMetric}>{t(`exercise.metrics.${metricKey}`)}</div>
        <svg className={styles.exerciseChart} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-labelledby="progression-exercise-chart-title">
          <title id="progression-exercise-chart-title">{t('exercise.chartTitle', { exercise: selected.exerciseName })}</title>
          {[0.25, 0.5, 0.75].map(ratio => <line key={ratio} x1={CHART_PADDING_X} x2={CHART_WIDTH - CHART_PADDING_X} y1={CHART_HEIGHT * ratio} y2={CHART_HEIGHT * ratio} className={styles.chartGrid} />)}
          <polyline points={chart.points} className={styles.performanceLine} />
          <text x="2" y={CHART_PADDING_Y + 4} className={styles.chartLabel}>{chart.max.toFixed(1)}</text>
          <text x="2" y={CHART_HEIGHT - CHART_PADDING_Y + 4} className={styles.chartLabel}>{chart.min.toFixed(1)}</text>
        </svg>
        <div className={styles.chartDates}>
          <span>{first ? dateLabel(first.date, locale) : '—'}</span>
          <span>{last ? dateLabel(last.date, locale) : '—'}</span>
        </div>
        <p className={styles.chartSummary}>{t('exercise.visibleSummary', {
          start: first?.value.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? '—',
          end: last?.value.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? '—',
          metric: t(`exercise.metrics.${metricKey}`),
        })}</p>
      </figure> : <div className={styles.inlineNotice}>{t('exercise.needsHistory')}</div>}
    </>}
  </section>
}
