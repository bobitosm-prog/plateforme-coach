import { describe, expect, it } from 'vitest'
import {
  completedWorkoutDateKeys,
  formatWorkoutSessionDate,
  groupWorkoutSets,
  prepareCompletionMarkers,
  prepareWorkoutSessions,
  RECENT_SESSION_FULL_LIMIT,
  RECENT_SESSION_PREVIEW_LIMIT,
  selectRecentWorkoutSessions,
  summarizeWorkoutDetail,
} from '@/lib/training/session-history'

const session = (id: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: 'Push',
  completed: true,
  created_at: createdAt,
  ...extra,
})

describe('Training session history boundary', () => {
  it('represents empty workout and completion histories independently', () => {
    expect(selectRecentWorkoutSessions([])).toEqual({ sessions: [], filteredCount: 0, totalCount: 0, isolated: [] })
    expect(prepareCompletionMarkers([])).toEqual({ completions: [], isolated: [] })
  })

  it('returns one recent session with its original legacy payload', () => {
    const input = session('workout-1', '2026-07-18T10:00:00Z', { notes: 'Bonne séance' })
    const result = selectRecentWorkoutSessions([input])
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].session).toBe(input)
  })

  it('sorts unordered sessions newest first without mutating the input', () => {
    const input = [
      session('old', '2026-07-16T10:00:00Z'),
      session('new', '2026-07-18T10:00:00Z'),
      session('middle', '2026-07-17T10:00:00Z'),
    ]
    const before = structuredClone(input)
    expect(prepareWorkoutSessions(input).sessions.map(row => row.session.id)).toEqual(['new', 'middle', 'old'])
    expect(input).toEqual(before)
  })

  it('keeps input order as deterministic tie-breaker for equal dates', () => {
    const sameDate = '2026-07-18T10:00:00Z'
    const input = [session('first', sameDate), session('second', sameDate), session('third', sameDate)]
    expect(prepareWorkoutSessions(input).sessions.map(row => row.session.id)).toEqual(['first', 'second', 'third'])
  })

  it('preserves preview and expanded recent-session limits', () => {
    const input = Array.from({ length: RECENT_SESSION_FULL_LIMIT + 5 }, (_, index) =>
      session(`workout-${index}`, new Date(Date.UTC(2026, 6, 31 - index)).toISOString()))
    expect(selectRecentWorkoutSessions(input).sessions).toHaveLength(RECENT_SESSION_PREVIEW_LIMIT)
    expect(selectRecentWorkoutSessions(input, { expanded: true }).sessions).toHaveLength(RECENT_SESSION_FULL_LIMIT)
  })

  it('preserves the legacy session type filter', () => {
    const input = [
      session('push', '2026-07-18T10:00:00Z', { name: 'Push A' }),
      session('legs', '2026-07-17T10:00:00Z', { name: 'Legs Quads' }),
    ]
    expect(selectRecentWorkoutSessions(input, { filter: 'jambes' }).sessions.map(row => row.session.id)).toEqual(['legs'])
  })

  it('isolates invalid dates and unknown legacy shapes without failing valid history', () => {
    const result = prepareWorkoutSessions([
      session('valid', '2026-07-18T10:00:00Z', { name: null, notes: null }),
      session('invalid-date', 'not-a-date'),
      { created_at: '2026-07-17T10:00:00Z' },
      null,
    ])
    expect(result.sessions.map(row => row.session.id)).toEqual(['valid'])
    expect(result.isolated).toEqual([
      { source: 'workout_sessions', index: 1, code: 'invalid_date' },
      { source: 'workout_sessions', index: 2, code: 'invalid_shape' },
      { source: 'workout_sessions', index: 3, code: 'invalid_shape' },
    ])
    expect(formatWorkoutSessionDate('not-a-date', 'fr')).toBeNull()
  })

  it('groups detailed sets in the query order and computes the existing summary', () => {
    const input = [
      { exercise_name: 'Développé couché', set_number: 1, weight: 80, reps: 10, completed: true },
      { exercise_name: 'Développé couché', set_number: 2, weight: 82.5, reps: 8, completed: true },
      { exercise_name: 'Pompes', set_number: 1, weight: 0, reps: 20, completed: true },
    ]
    const before = structuredClone(input)
    const grouped = groupWorkoutSets(input)
    expect(grouped.detail.map(exercise => [exercise.name, exercise.sets.map(set => set.set_number)])).toEqual([
      ['Développé couché', [1, 2]],
      ['Pompes', [1]],
    ])
    expect(summarizeWorkoutDetail(grouped.detail)).toEqual({ totalExercises: 2, totalSets: 3, totalVolume: 1460 })
    expect(input).toEqual(before)
  })

  it('isolates incomplete workout sets while preserving usable details', () => {
    const result = groupWorkoutSets([
      { exercise_name: 'Squat', set_number: 1, weight: null, reps: null },
      { exercise_name: '' },
      { set_number: 2 },
      undefined,
    ])
    expect(result.detail).toEqual([{ name: 'Squat', sets: [{ exercise_name: 'Squat', set_number: 1, weight: null, reps: null }] }])
    expect(result.isolated).toHaveLength(3)
    expect(summarizeWorkoutDetail(result.detail).totalVolume).toBe(0)
  })

  it('keeps completed_sessions distinct when no workout_session is associated', () => {
    const completions = prepareCompletionMarkers([
      { id: 'completion-only', session_index: 2, completed_at: '2026-07-18T11:00:00Z' },
    ])
    const workouts = prepareWorkoutSessions([])
    expect(completions.completions.map(row => row.id)).toEqual(['completion-only'])
    expect(workouts.sessions).toEqual([])
  })

  it('keeps workout_sessions distinct when no completed_sessions marker exists', () => {
    const workouts = prepareWorkoutSessions([session('workout-only', '2026-07-18T10:00:00Z')])
    const completions = prepareCompletionMarkers([])
    expect(workouts.sessions.map(row => row.session.id)).toEqual(['workout-only'])
    expect(completions.completions).toEqual([])
  })

  it('sorts and bounds completion markers without merging or mutating them', () => {
    const input = Array.from({ length: 55 }, (_, index) => ({
      id: `completion-${index}`,
      session_index: index,
      completed_at: new Date(Date.UTC(2026, 6, 31 - (index % 28), index % 24)).toISOString(),
    }))
    const before = structuredClone(input)
    const result = prepareCompletionMarkers(input)
    expect(result.completions).toHaveLength(50)
    expect(result.completions[0].completed_at >= result.completions[1].completed_at).toBe(true)
    expect(input).toEqual(before)
  })

  it('isolates invalid completion dates and preserves legacy completed date keys', () => {
    expect(prepareCompletionMarkers([
      { id: 'invalid', session_index: 0, completed_at: 'invalid' },
      { id: 'valid', session_index: 1, completed_at: '2026-07-18T10:00:00Z' },
    ])).toMatchObject({
      completions: [{ id: 'valid' }],
      isolated: [{ source: 'completed_sessions', index: 0, code: 'invalid_date' }],
    })
    expect([...completedWorkoutDateKeys([
      { completed: true, date: '2026-07-18' },
      { completed: false, date: '2026-07-17' },
      { completed: true, created_at: '2026-07-16T10:00:00Z' },
    ])]).toEqual(['2026-07-18'])
  })
})
