import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PREVIOUS_PERFORMANCE_MAX_ROWS,
  adjustRepsValue,
  adjustWeightValue,
  buildPreviousPerformanceMap,
  getPreviousPerformanceLimit,
  resolveCurrentSetPrefill,
} from '@/lib/training/set-logging'

const workoutSession = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
const currentSetEditor = readFileSync('app/components/training-v2/CurrentSetEditor.tsx', 'utf8')
const trainingStyles = readFileSync('app/components/training-v2/TrainingV2.module.css', 'utf8')

describe('Training V2 set logging', () => {
  it('keeps the previous-performance read bounded independently of exercise count', () => {
    expect(getPreviousPerformanceLimit(0)).toBe(30)
    expect(getPreviousPerformanceLimit(3)).toBe(90)
    expect(getPreviousPerformanceLimit(100)).toBe(PREVIOUS_PERFORMANCE_MAX_ROWS)
    expect(workoutSession).toContain('.limit(getPreviousPerformanceLimit(previousReferences.length))')
    expect(workoutSession).not.toMatch(/for \(const .*\)[\s\S]{0,500}\.from\('workout_sets'\)/)
  })

  it('maps history by stable id first and exposes the last-performance contract', () => {
    const result = buildPreviousPerformanceMap([
      { key: 'local-bench', exerciseId: 'bench-id', name: 'Développé couché' },
    ], [
      { exercise_id: 'bench-id', exercise_name: 'Bench press', session_id: 'new', set_number: 2, weight: 82.5, reps: 8, rir: 1, completed: true, created_at: '2026-08-29T10:02:00Z' },
      { exercise_id: 'bench-id', exercise_name: 'Bench press', session_id: 'new', set_number: 1, weight: 80, reps: 10, rir: 2, completed: true, created_at: '2026-08-29T10:01:00Z' },
      { exercise_id: 'bench-id', exercise_name: 'Bench press', session_id: 'old', set_number: 1, weight: 77.5, reps: 10, rir: 3, completed: true, created_at: '2026-08-20T10:01:00Z' },
    ])

    expect(result['local-bench']).toMatchObject({
      state: 'ready',
      lastWeight: 82.5,
      lastReps: 8,
      lastRir: 1,
      lastPerformedAt: '2026-08-29T10:02:00Z',
    })
    expect(result['local-bench'].sessions).toHaveLength(2)
    expect(result['local-bench'].latestSets.map(set => set.weight)).toEqual([80, 82.5])
  })

  it('distinguishes a load error from a real absence of history', () => {
    const references = [{ key: 'squat', exerciseId: null, name: 'Squat' }]
    expect(buildPreviousPerformanceMap(references, []).squat.state).toBe('no_history')
    expect(buildPreviousPerformanceMap(references, [], true).squat.state).toBe('error')
  })

  it('applies draft, prescription, previous, empty priority without overwriting drafts', () => {
    expect(resolveCurrentSetPrefill({
      draftWeight: 60,
      draftWeightRaw: '60',
      draftReps: 8,
      prescribedWeight: 55,
      prescribedReps: 10,
      previousWeight: 50,
      previousReps: 12,
    })).toMatchObject({ weight: 60, reps: 8, weightSource: 'draft', repsSource: 'draft' })

    expect(resolveCurrentSetPrefill({
      draftWeight: '', draftWeightRaw: '', draftReps: '',
      prescribedWeight: 55, prescribedReps: 10,
      previousWeight: 50, previousReps: 12,
    })).toMatchObject({ weight: 55, weightRaw: '55', reps: 10, weightSource: 'prescription', repsSource: 'prescription' })

    expect(resolveCurrentSetPrefill({
      draftWeight: '', draftWeightRaw: '', draftReps: '',
      previousWeight: 50, previousReps: 12,
    })).toMatchObject({ weight: 50, reps: 12, weightSource: 'previous', repsSource: 'previous' })
  })

  it('provides deterministic one-hand weight and reps controls', () => {
    expect(adjustWeightValue('20', 1, 2.5)).toBe('22,5')
    expect(adjustWeightValue('1,25', -1, 2.5)).toBe('0')
    expect(adjustRepsValue('', 1)).toBe(1)
    expect(adjustRepsValue(1, -1)).toBe(0)
    expect(currentSetEditor).toContain('aria-pressed={rir === value}')
    expect(currentSetEditor).toContain("inputMode=\"decimal\"")
    expect(currentSetEditor).toContain("inputMode=\"numeric\"")
  })

  it('keeps progression suggestions explicit and advances the persisted draft position', () => {
    expect(currentSetEditor).toContain('onUseSuggestion')
    expect(currentSetEditor).toContain("t('useSuggestion')")
    expect(workoutSession).toContain('const nextPosition = findNextWorkoutPosition')
    expect(workoutSession).toContain('setActiveExerciseIndex(nextPosition.currentExerciseIndex)')
    expect(workoutSession).toContain('exercises: updatedExercises as WorkoutDraftExercise[]')
    expect(workoutSession).not.toContain("from('workout_sets').insert")
  })

  it('renders one current-set authority and removes the legacy logger path', () => {
    expect(workoutSession.match(/<CurrentSetEditor/g)).toHaveLength(1)
    expect(workoutSession).not.toContain('legacyLoggerHidden')
    expect(trainingStyles).not.toContain('legacyLoggerHidden')
    expect(currentSetEditor).not.toContain('supabase')
  })
})
