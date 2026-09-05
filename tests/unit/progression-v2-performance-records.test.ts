import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  getPersonalRecordsState,
  getRecordTypeKey,
} from '@/app/components/progression-v2/PersonalRecordsV2'
import {
  getExerciseMetricKey,
  getExerciseProgressionState,
} from '@/app/components/progression-v2/ExerciseProgression'
import { getWeeklyVolumeState } from '@/app/components/progression-v2/WeeklyVolumeTrend'
import {
  buildProgressionViewModel,
  type ProgressionViewModelInput,
} from '@/lib/progression/progression-dashboard-model'

function input(overrides: Partial<ProgressionViewModelInput> = {}): ProgressionViewModelInput {
  return {
    period: '30d',
    now: new Date('2026-08-26T12:00:00.000Z'),
    weight: { logs: [] },
    sessions: {
      rows: [
        { created_at: '2026-08-19T10:00:00Z', completed: true, workout_sets: [{ exercise_id: 'bench', exercise_name: 'Bench press', weight: 80, reps: 8, completed: true, created_at: '2026-08-19T10:00:00Z' }] },
        { created_at: '2026-08-25T10:00:00Z', completed: true, workout_sets: [{ exercise_id: 'bench', exercise_name: 'Bench press', weight: 85, reps: 8, completed: true, created_at: '2026-08-25T10:00:00Z' }] },
      ],
    },
    records: {
      rows: [
        { exercise_name: 'Bench press', record_type: '1rm', value: 107.7, unit: 'kg', achieved_at: '2026-08-19' },
        { exercise_name: 'Squat', record_type: 'max_weight', value: 140, previous_value: 135, unit: 'kg', achieved_at: '2026-08-18' },
        { exercise_name: 'Pull-up', record_type: 'max_reps', value: 18, unit: 'reps', achieved_at: '2026-08-17' },
        { exercise_name: 'Deadlift', record_type: 'best_volume', value: 2400, unit: 'kg', achieved_at: '2026-08-16' },
      ],
    },
    measurements: { rows: [] },
    photos: { rows: [] },
    wellbeing: { rows: [] },
    ...overrides,
  }
}

describe('Progression V2 personal records', () => {
  it('keeps 1RM explicitly estimated and supports actual record types only', () => {
    const records = buildProgressionViewModel(input()).records
    expect(records.items[0]).toMatchObject({ recordType: '1rm', estimated: true, recordedAt: '2026-08-19' })
    expect(getRecordTypeKey('1rm')).toBe('estimated1rm')
    expect(getRecordTypeKey('max_weight')).toBe('maxWeight')
    expect(getRecordTypeKey('max_reps')).toBe('maxReps')
    expect(getRecordTypeKey('best_volume')).toBe('bestVolume')
    expect(getRecordTypeKey('unknown')).toBe('other')
  })

  it('does not manufacture record event history or an absent previous value', () => {
    const records = buildProgressionViewModel(input()).records
    expect(records.hasEventHistory).toBe(false)
    expect(records.items[0].previousValue).toBeNull()
    expect(records.items[0].delta).toBeNull()
  })

  it('keeps each record own date instead of grouping dates by exercise', () => {
    const records = buildProgressionViewModel(input()).records
    expect(records.items.map(record => record.recordedAt)).toEqual(['2026-08-19', '2026-08-18', '2026-08-17', '2026-08-16'])
  })

  it('preserves empty and error states without a zero PR metric', () => {
    const empty = buildProgressionViewModel(input({ records: { rows: [] } })).records
    const failed = buildProgressionViewModel(input({ records: { rows: [], state: 'error', errorCode: 'FAILED' } })).records
    expect(getPersonalRecordsState(empty)).toBe('empty')
    expect(getPersonalRecordsState(failed)).toBe('error')
    expect(failed.items).toEqual([])
  })
})

describe('Progression V2 exercise progression', () => {
  it('uses only known normalized exercises and their e1RM series', () => {
    const exerciseProgress = buildProgressionViewModel(input()).exerciseProgress
    expect(getExerciseProgressionState(exerciseProgress)).toBe('ready')
    expect(exerciseProgress.exercises).toHaveLength(1)
    expect(exerciseProgress.exercises[0]).toMatchObject({ exerciseId: 'bench', exerciseName: 'Bench press', metric: 'e1rm' })
    expect(exerciseProgress.exercises[0].series.map(point => point.value)).toEqual([101.3, 107.7])
  })

  it('has explicit labels for the current metric and future real fallbacks', () => {
    expect(getExerciseMetricKey('e1rm')).toBe('estimated1rm')
    expect(getExerciseMetricKey('max_weight')).toBe('maxWeight')
    expect(getExerciseMetricKey('volume')).toBe('volume')
  })

  it('preserves exercise errors instead of displaying zero', () => {
    const failed = buildProgressionViewModel(input({ sessions: { rows: [], state: 'error', errorCode: 'FAILED' } })).exerciseProgress
    expect(getExerciseProgressionState(failed)).toBe('error')
    expect(failed.exercises).toEqual([])
  })
})

describe('Progression V2 weekly volume', () => {
  it('compares current and previous weeks from the unified model', () => {
    const volume = buildProgressionViewModel(input()).volume
    expect(getWeeklyVolumeState(volume)).toBe('ready')
    expect(volume.currentWeek).toBe(680)
    expect(volume.previousWeek).toBe(640)
    expect(volume.deltaPercent).toBe(6)
  })

  it('does not manufacture a percentage when previous week is zero', () => {
    const volume = buildProgressionViewModel(input({
      sessions: { rows: [input().sessions.rows[1]] },
    })).volume
    expect(volume.previousWeek).toBe(0)
    expect(volume.deltaPercent).toBeNull()
  })

  it('preserves volume errors instead of displaying zero', () => {
    const failed = buildProgressionViewModel(input({ sessions: { rows: [], state: 'error', errorCode: 'FAILED' } })).volume
    expect(getWeeklyVolumeState(failed)).toBe('error')
    expect(failed.currentWeek).toBeNull()
  })
})

describe('Progression V2 performance architecture and legacy cleanup', () => {
  const records = readFileSync('app/components/progression-v2/PersonalRecordsV2.tsx', 'utf8')
  const exercise = readFileSync('app/components/progression-v2/ExerciseProgression.tsx', 'utf8')
  const volume = readFileSync('app/components/progression-v2/WeeklyVolumeTrend.tsx', 'utf8')
  const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
  const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
  const analytics = readFileSync('app/components/AnalyticsSection.tsx', 'utf8')

  it('keeps all visual components pure and model-driven', () => {
    expect(`${records}\n${exercise}\n${volume}`).not.toMatch(/supabase|\.from\(|fetch\(|exercises_db|workout_sets|personal_records/i)
    expect(shell).toContain('<PersonalRecordsV2 records={model.records}')
    expect(shell).toContain('<ExerciseProgression exerciseProgress={model.exerciseProgress}')
    expect(shell).toContain('<WeeklyVolumeTrend volume={model.volume}')
  })

  it('renders one accessible exercise chart with a textual summary', () => {
    expect(exercise.match(/<svg/g)).toHaveLength(1)
    expect(exercise).toContain('<figcaption className={styles.srOnly}>')
    expect(exercise).toContain('styles.chartSummary')
    expect(exercise).toContain('<select')
    expect(exercise).not.toContain('exercises_db')
  })

  it('never exposes fake previous PR history in the records view', () => {
    expect(records).not.toContain('previousValue')
    expect(records).not.toContain('record.delta')
  })

  it('removes legacy PR, exercise and weekly volume rendering while preserving focused advanced analytics', () => {
    expect(progressTab).not.toContain('SECTION 5 — RECORDS PERSONNELS')
    expect(analytics).not.toContain('showTrainingVolume')
    expect(analytics).not.toContain('showExerciseProgress')
    expect(analytics).toContain("t('muscleVolumeTitle')")
    expect(analytics).toContain("tV2('history.advanced.rir')")
    expect(progressTab).toContain('advancedOpen &&')
    expect(progressTab).toContain('<AnalyticsSection wSessions={wSessions} muscleMap={advancedMuscleMap} mappingState={advancedMappingState}')
  })

  it('adds no API and preserves neutral volume semantics', () => {
    expect(`${records}\n${exercise}\n${volume}`).not.toMatch(/\/api\/|excellent|poor|quality score/i)
    expect(volume).toContain("volume.deltaPercent == null ? t('comparisonUnavailable')")
  })
})

describe('Progression V2 performance translations', () => {
  const paths = [
    'records.title', 'records.types.estimated1rm', 'records.types.maxWeight', 'records.types.maxReps', 'records.types.bestVolume', 'records.types.other',
    'exercise.title', 'exercise.selectorLabel', 'exercise.metrics.estimated1rm', 'exercise.empty',
    'weeklyVolume.title', 'weeklyVolume.current', 'weeklyVolume.previous', 'weeklyVolume.definition',
  ]

  function atPath(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => (
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
    ), value)
  }

  it.each(['fr', 'en', 'de'])('contains all required %s messages', locale => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>
    for (const path of paths) expect(atPath(messages, `progress.v2.${path}`), `${locale}:${path}`).toEqual(expect.any(String))
  })
})
