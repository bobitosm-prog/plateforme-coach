import { describe, expect, it, vi } from 'vitest'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '../../lib/training/workout-session-storage'
import {
  createWorkoutLocalStoragePort, persistDetailedWorkout, persistQuickWorkout,
  type DetailedWorkoutPersistenceInput, type WorkoutPersistenceIssue, type WorkoutPersistencePort,
} from '../../lib/training/workout-persistence'

const fixedDate = new Date('2026-07-18T12:00:00.000Z')
const input = (): DetailedWorkoutPersistenceInput => ({
  userId: 'auth-user', workoutName: 'Jambes', weekdayKey: 'samedi',
  durationMs: 3_600_000, completedSets: 2, totalSets: 3, totalVolume: 1_200,
  assignment: { clientProgramId: 'program-1', coachOfProgramId: 'coach-1' },
  exercises: [{ name: 'Squat', muscle: 'Jambes', exerciseId: 'exercise-1', setsTarget: 3, sets: [
    { weight: 80, reps: 8, rir: 2 }, { weight: 80, reps: 8, rir: 1 },
  ] }],
})

function memoryStorage() {
  const entries = new Map<string, string>([[ACTIVE_WORKOUT_STORAGE_KEY, '{}']])
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
    removeItem: (key: string) => { entries.delete(key) },
  }
}

function harness(failures: WorkoutPersistenceIssue[] = []) {
  const calls: string[] = []
  const failed = new Set(failures)
  const storage = memoryStorage()
  const succeeds = (issue: WorkoutPersistenceIssue) => failed.has(issue) ? { ok: false as const } : { ok: true as const, value: undefined }
  const persistence: WorkoutPersistencePort = {
    async createSession(payload) {
      calls.push('workout_sessions')
      expect(payload).toMatchObject({ user_id: 'auth-user', duration_minutes: 60 })
      return failed.has('session_create_failed') ? { ok: false } : { ok: true, value: { id: 'session-1' } }
    },
    async markScheduleCompleted(payload) {
      calls.push('scheduled_sessions')
      expect(payload).toEqual({ userId: 'auth-user', scheduledDate: '2026-07-18', completedAt: fixedDate.toISOString() })
      return succeeds('schedule_update_failed')
    },
    async createSets(payload) {
      calls.push('workout_sets')
      expect(payload).toEqual([
        { session_id: 'session-1', user_id: 'auth-user', exercise_name: 'Squat', exercise_id: 'exercise-1', set_number: 1, reps: 8, weight: 80, completed: true, rir: 2 },
        { session_id: 'session-1', user_id: 'auth-user', exercise_name: 'Squat', exercise_id: 'exercise-1', set_number: 2, reps: 8, weight: 80, completed: true, rir: 1 },
      ])
      return succeeds('sets_create_failed')
    },
    async updateLastWorkout(payload) {
      calls.push('profiles')
      expect(payload).toEqual({ userId: 'auth-user', completedAt: fixedDate.toISOString() })
      return succeeds('profile_sync_failed')
    },
    async createCompletionMarker(payload) {
      calls.push('completed_sessions')
      expect(payload).toMatchObject({ client_id: 'auth-user', coach_id: 'coach-1', program_id: 'program-1', session_index: 5, session_name: 'Jambes' })
      return succeeds('completion_marker_failed')
    },
  }
  const hooks = {
    afterSessionCreated: vi.fn(async () => { calls.push('after_session') }),
    afterSetsAttempted: vi.fn(async () => { calls.push('after_sets') }),
  }
  return {
    calls, storage, hooks,
    run: (override = input()) => persistDetailedWorkout(override, {
      local: createWorkoutLocalStoragePort(storage), persistence,
      clock: { now: () => new Date(fixedDate) }, hooks,
    }),
  }
}

describe('workout persistence service', () => {
  it('persists a detailed session in the exact legacy order and clears active cache first', async () => {
    const test = harness()
    const before = structuredClone(input())
    const result = await test.run(before)
    expect(result).toEqual({ ok: true, status: 'complete', sessionId: 'session-1', cacheCleanupAttemptedBeforePersistence: true })
    expect(test.storage.entries.has(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(false)
    expect(test.calls).toEqual([
      'workout_sessions', 'scheduled_sessions', 'after_session', 'workout_sets',
      'after_sets', 'scheduled_sessions', 'profiles', 'completed_sessions',
    ])
    expect(before).toEqual(input())
  })

  it('returns a pre-persistence refusal and performs no operation without authenticated identity', async () => {
    const test = harness()
    const result = await test.run({ ...input(), userId: '' })
    expect(result).toEqual({ ok: false, status: 'before_persistence_failure', reason: 'missing_authenticated_user' })
    expect(test.calls).toEqual([])
    expect(test.storage.entries.has(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(true)
  })

  it.each([
    ['session_create_failed', 'session_create_failed'],
    ['sets_create_failed', 'sets_failed'],
    ['completion_marker_failed', 'completion_marker_failed'],
    ['schedule_update_failed', 'schedule_failed'],
    ['profile_sync_failed', 'after_session_failure'],
  ] as const)('reports the %s partial state without raw provider details', async (issue, status) => {
    const test = harness([issue])
    const result = await test.run()
    expect(result).toMatchObject({ ok: false, status, issues: [issue], requiresReconciliation: true })
    expect(JSON.stringify(result)).not.toMatch(/database|postgres|token|private/i)
    if (issue === 'session_create_failed') {
      expect(test.calls).not.toContain('workout_sets')
      expect(test.calls).not.toContain('after_session')
    }
    if (issue === 'profile_sync_failed') expect(test.calls).not.toContain('completed_sessions')
  })

  it('reports multiple write failures as reconciliation-required without stopping non-blocking legacy steps', async () => {
    const test = harness(['schedule_update_failed', 'sets_create_failed'])
    const result = await test.run()
    expect(result).toMatchObject({
      ok: false, status: 'partial_reconciliation_required',
      issues: ['schedule_update_failed', 'sets_create_failed'], requiresReconciliation: true,
    })
    expect(test.calls).toContain('completed_sessions')
  })

  it('skips workout_sets for a detailed session without set facts and skips completion without assignment', async () => {
    const test = harness()
    const value = input()
    value.exercises = [{ name: 'Mobilité', muscle: 'Corps entier', sets: [] }]
    value.assignment = { clientProgramId: null, coachOfProgramId: null }
    const result = await test.run(value)
    expect(result).toMatchObject({ ok: true, status: 'complete' })
    expect(test.calls).not.toContain('workout_sets')
    expect(test.calls).not.toContain('completed_sessions')
  })

  it('characterizes repeated finalization as non-idempotent', async () => {
    const test = harness()
    await test.run()
    await test.run()
    expect(test.calls.filter(call => call === 'workout_sessions')).toHaveLength(2)
    expect(test.calls.filter(call => call === 'completed_sessions')).toHaveLength(2)
  })

  it('persists the quick flow without workout_sets and keeps its legacy notes', async () => {
    const test = harness()
    const result = await persistQuickWorkout({
      userId: 'auth-user', workoutName: 'Haut du corps', durationMinutes: 0,
      completedSets: 4, totalSets: 6, exerciseCount: 2,
    }, {
      createSession: async payload => {
        expect(payload).toMatchObject({ duration_minutes: 1, notes: '4/6 séries · 2 exercices', muscles_worked: null })
        return { ok: true, value: { id: 'quick-session' } }
      },
    })
    expect(result).toEqual({ ok: true, status: 'complete', sessionId: 'quick-session' })
    expect(test.calls).toEqual([])
  })

  it('keeps cache cleanup best-effort and still attempts persistence when storage fails', async () => {
    const test = harness()
    test.storage.removeItem = () => { throw new Error('storage unavailable') }
    await expect(test.run()).resolves.toMatchObject({ ok: true, cacheCleanupAttemptedBeforePersistence: true })
    expect(test.calls[0]).toBe('workout_sessions')
  })

  it('expurgates thrown provider failures into a stable result', async () => {
    const storage = memoryStorage()
    const result = await persistQuickWorkout({
      userId: 'auth-user', workoutName: 'Test', durationMinutes: 1,
      completedSets: 0, totalSets: 0, exerciseCount: 0,
    }, { createSession: async () => { throw new Error('private SQL token detail') } })
    expect(result).toEqual({ ok: false, status: 'session_create_failed', requiresReconciliation: false })
    expect(JSON.stringify(result)).not.toContain('private SQL token detail')
    expect(storage.entries.has(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(true)
  })
})
