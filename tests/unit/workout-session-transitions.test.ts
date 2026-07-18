import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addXP: vi.fn(), updateStreak: vi.fn(), updateProfile: vi.fn(),
  checkAndUnlockBadges: vi.fn(async () => ({ newlyUnlockedIds: [] as string[] })),
  toastSuccess: vi.fn(),
}))

vi.mock('../../lib/gamification', () => ({ addXP: mocks.addXP, updateStreak: mocks.updateStreak }))
vi.mock('../../lib/profile-service', () => ({ updateProfile: mocks.updateProfile }))
vi.mock('../../lib/check-badges', () => ({ checkAndUnlockBadges: mocks.checkAndUnlockBadges }))
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }))

import { useClientDashboardActions as createClientDashboardActions, type WorkoutSessionDraft } from '../../lib/client-dashboard/use-client-dashboard-actions'

type FailureStage = 'workout_sessions' | 'scheduled_sessions' | 'workout_sets' | 'completed_sessions' | null
type Call = { table: string; operation: 'insert' | 'update'; payload: unknown }

function storage() {
  const entries = new Map<string, string>()
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
    removeItem: (key: string) => { entries.delete(key) },
  }
}

function supabaseDouble(failure: FailureStage = null) {
  const calls: Call[] = []
  const response = (table: string) => ({
    data: table === 'workout_sessions' && failure !== table ? { id: `session-${calls.filter(call => call.table === table).length}` } : null,
    error: failure === table ? { message: 'private database detail' } : null,
  })
  const query = (table: string) => {
    let result = response(table)
    const chain: Record<string, unknown> = {
      insert(payload: unknown) { calls.push({ table, operation: 'insert', payload }); result = response(table); return chain },
      update(payload: unknown) { calls.push({ table, operation: 'update', payload }); result = response(table); return chain },
      select() { return chain },
      single: async () => result,
      eq() { return chain },
      in() { return chain },
      then(resolve: (value: typeof result) => unknown) { return Promise.resolve(result).then(resolve) },
    }
    return chain
  }
  return { calls, client: { from: (table: string) => query(table) } }
}

function setup(failure: FailureStage = null, assignment = true) {
  const db = supabaseDouble(failure)
  const setWorkoutSession = vi.fn()
  const fetchAll = vi.fn(async () => undefined)
  const workoutSession: WorkoutSessionDraft = { name: 'Jambes', exercises: [], startedAt: '2026-07-18T10:00:00.000Z', weekdayKey: 'samedi' }
  const options = {
    supabase: db.client, session: { user: { id: 'auth-user' } }, profile: null, coachProgram: null, workoutSession,
    setWorkoutSession, setModal: vi.fn(), setPhotoUploading: vi.fn(), setProgressPhotos: vi.fn(), setProfile: vi.fn(),
    getProgramAssignment: () => assignment ? { clientProgramId: 'program-1', coachOfProgramId: 'coach-1' } : { clientProgramId: null, coachOfProgramId: null },
    fetchAll, checkForPR: vi.fn(async () => ({ newPR: false })), regenerateWeekSchedule: vi.fn(),
    updateReminderSettings: vi.fn(), updateRirSettings: vi.fn(),
  } as unknown as Parameters<typeof createClientDashboardActions>[0]
  return { ...db, actions: createClientDashboardActions(options), setWorkoutSession, fetchAll }
}

const finished = {
  duration: 3_600_000, completedSets: 2, totalSets: 3, totalVolume: 1_200,
  exercises: [{ name: 'Squat', muscle: 'Jambes', exerciseId: 'exercise-1', setsTarget: 3, sets: [
    { weight: 80, reps: 8, rir: 2 }, { weight: 80, reps: 8, rir: 1 },
  ] }],
}

describe('current workout persistence transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
    vi.stubGlobal('localStorage', storage())
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    vi.clearAllMocks()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('starts scheduled and free sessions with server-session-independent local envelopes', async () => {
    const { actions, setWorkoutSession } = setup()
    await actions.startProgramWorkout({ day_name: 'Jambes' }, [{ name: 'Squat' }], 'samedi')
    expect(setWorkoutSession).toHaveBeenLastCalledWith({ name: 'Jambes', exercises: [{ name: 'Squat' }], startedAt: '2026-07-18T12:00:00.000Z', weekdayKey: 'samedi' })
    expect(JSON.parse(localStorage.getItem('moovx_active_workout')!)).toMatchObject({ name: 'Jambes', weekdayKey: 'samedi' })
    await actions.startProgramWorkout({ name: 'Séance libre' }, [])
    expect(JSON.parse(localStorage.getItem('moovx_active_workout')!)).toEqual({ name: 'Séance libre', exercises: [], startedAt: '2026-07-18T12:00:00.000Z' })
  })

  it('persists a successful finalization in its current deterministic order', async () => {
    const { actions, calls, fetchAll } = setup()
    localStorage.setItem('moovx_active_workout', '{}')
    const immutableInput = structuredClone(finished)
    await actions.onFinishWorkout(finished)
    expect(finished).toEqual(immutableInput)
    expect(localStorage.getItem('moovx_active_workout')).toBeNull()
    expect(calls.map(call => `${call.table}:${call.operation}`)).toEqual([
      'workout_sessions:insert', 'scheduled_sessions:update', 'workout_sets:insert',
      'scheduled_sessions:update', 'completed_sessions:insert',
    ])
    expect(calls[0].payload).toMatchObject({ user_id: 'auth-user', completed: true, duration_minutes: 60, muscles_worked: ['Jambes'] })
    expect(calls[2].payload).toEqual([
      { session_id: 'session-1', user_id: 'auth-user', exercise_name: 'Squat', exercise_id: 'exercise-1', set_number: 1, reps: 8, weight: 80, completed: true, rir: 2 },
      { session_id: 'session-1', user_id: 'auth-user', exercise_name: 'Squat', exercise_id: 'exercise-1', set_number: 2, reps: 8, weight: 80, completed: true, rir: 1 },
    ])
    expect(calls[4].payload).toMatchObject({ client_id: 'auth-user', coach_id: 'coach-1', program_id: 'program-1', session_index: 5 })
    expect(fetchAll).toHaveBeenCalledWith(true)
  })

  it.each([
    ['root session insert', 'workout_sessions'], ['calendar update', 'scheduled_sessions'],
    ['set insert', 'workout_sets'], ['program completion marker', 'completed_sessions'],
  ] as const)('characterizes the non-transactional partial failure at %s', async (_label, stage) => {
    const { actions, calls } = setup(stage)
    localStorage.setItem('moovx_active_workout', '{}')
    await expect(actions.onFinishWorkout(finished)).resolves.toBeDefined()
    expect(localStorage.getItem('moovx_active_workout')).toBeNull()
    if (stage === 'workout_sessions') {
      expect(calls.some(call => call.table === 'workout_sets')).toBe(false)
      expect(calls.some(call => call.table === 'scheduled_sessions')).toBe(true)
    } else {
      expect(calls[0].table).toBe('workout_sessions')
    }
  })

  it('characterizes repeated finalization as non-idempotent', async () => {
    const { actions, calls } = setup()
    await actions.onFinishWorkout(finished)
    await actions.onFinishWorkout(finished)
    expect(calls.filter(call => call.table === 'workout_sessions')).toHaveLength(2)
    expect(calls.filter(call => call.table === 'completed_sessions')).toHaveLength(2)
  })

  it('does not create a completion marker without a coach assignment', async () => {
    const { actions, calls } = setup(null, false)
    await actions.onFinishWorkout(finished)
    expect(calls.some(call => call.table === 'completed_sessions')).toBe(false)
  })
})
