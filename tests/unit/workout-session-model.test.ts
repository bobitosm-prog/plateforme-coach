import { describe, expect, it } from 'vitest'
import {
  abandonWorkout,
  adaptLegacyWorkoutExercise,
  addWorkoutExercise,
  cancelWorkoutRest,
  createLegacyWorkoutLaunch,
  createWorkoutSession,
  finishWorkoutRest,
  prepareWorkoutFinalization,
  removeWorkoutExercise,
  startWorkout,
  startWorkoutRest,
  updateWorkoutSet,
  type WorkoutClock,
  type WorkoutSessionExercise,
  type WorkoutSessionState,
  type WorkoutTransitionResult,
} from '../../lib/training/workout-session-model'

const clock = (iso = '2026-07-18T10:00:00.000Z'): WorkoutClock => ({ now: () => new Date(iso) })

const squat = (): WorkoutSessionExercise => ({
  id: 'exercise-squat', index: 0, name: 'Squat', muscle: 'Jambes', exerciseId: 'catalog-squat',
  targetSets: 2, targetRepetitions: '8-10', restSeconds: 90, legacy: null,
  sets: [
    { id: 'set-1', index: 0, weight: 80, repetitions: 8, completed: false, rir: null },
    { id: 'set-2', index: 1, weight: 80, repetitions: 8, completed: false, rir: null },
  ],
})

function stateOf(result: WorkoutTransitionResult): WorkoutSessionState {
  if (!result.ok) throw new Error(result.reason)
  return result.state
}

function prepared(source: 'free' | 'scheduled' = 'free'): WorkoutSessionState {
  const result = createWorkoutSession({
    name: source === 'free' ? 'Séance libre' : 'Jambes',
    source: source === 'free' ? { kind: 'free' } : { kind: 'scheduled', weekdayKey: 'samedi' },
    exercises: [squat()],
  }, clock())
  if (!result.ok || !('state' in result)) throw new Error(result.reason)
  return result.state
}

describe('pure workout session model', () => {
  it('creates free and scheduled sessions with an injected clock', () => {
    const free = prepared('free')
    const scheduled = prepared('scheduled')
    expect(free).toMatchObject({ phase: 'prepared', session: { name: 'Séance libre', source: { kind: 'free' }, startedAt: '2026-07-18T10:00:00.000Z' } })
    expect(scheduled).toMatchObject({ phase: 'prepared', session: { source: { kind: 'scheduled', weekdayKey: 'samedi' } } })
  })

  it('preserves the legacy launch envelope used by the dashboard', () => {
    const exercises = [{ exercise_name: 'Squat', sets: 3 }]
    const before = structuredClone(exercises)
    expect(createLegacyWorkoutLaunch({ name: 'Jambes', exercises, weekdayKey: 'samedi' }, clock())).toEqual({
      name: 'Jambes', exercises, startedAt: '2026-07-18T10:00:00.000Z', weekdayKey: 'samedi',
    })
    expect(exercises).toEqual(before)
  })

  it('adapts known legacy exercises and isolates unknown or incomplete data', () => {
    const converted = adaptLegacyWorkoutExercise({ exercise_name: 'Squat', muscle_group: 'Jambes', sets: 2, reps: '8-10', rest_seconds: 90 }, 0)
    expect(converted).toMatchObject({ kind: 'supported', exercise: { name: 'Squat', targetSets: 2, targetRepetitions: '8-10', restSeconds: 90 } })
    expect(adaptLegacyWorkoutExercise(null, 0)).toEqual({ kind: 'unsupported', input: null, reason: 'not_an_object' })
    expect(adaptLegacyWorkoutExercise({ sets: 3 }, 0)).toEqual({ kind: 'unsupported', input: { sets: 3 }, reason: 'missing_name' })
  })

  it('uses stable injected/default identities and warns without silently repairing ambiguous sets', () => {
    const first = adaptLegacyWorkoutExercise({ name: 'Row', sets: 'invalid' }, 2)
    const second = adaptLegacyWorkoutExercise({ name: 'Row', sets: 'invalid' }, 2)
    expect(first).toEqual(second)
    expect(first).toMatchObject({ kind: 'supported', warnings: ['invalid_sets_defaulted'], exercise: { id: 'exercise-2', targetSets: 3 } })
  })

  it('allows prepared → in-progress once and refuses an invalid repeat', () => {
    const running = stateOf(startWorkout(prepared()))
    expect(running.phase).toBe('in-progress')
    expect(startWorkout(running)).toEqual({ ok: false, state: running, reason: 'invalid_phase' })
  })

  it('updates sets immutably and refuses unknown exercise or set identities', () => {
    const running = stateOf(startWorkout(prepared()))
    const before = structuredClone(running)
    const updated = stateOf(updateWorkoutSet(running, 'exercise-squat', 'set-1', { completed: true, weight: 82.5, rir: 2 }))
    expect(updated.session.exercises[0].sets[0]).toMatchObject({ completed: true, weight: 82.5, rir: 2 })
    expect(running).toEqual(before)
    expect(updateWorkoutSet(running, 'missing', 'set-1', { completed: true })).toMatchObject({ ok: false, reason: 'exercise_not_found' })
    expect(updateWorkoutSet(running, 'exercise-squat', 'missing', { completed: true })).toMatchObject({ ok: false, reason: 'set_not_found' })
  })

  it('adds and removes exercises immutably while maintaining order', () => {
    const running = stateOf(startWorkout(prepared()))
    const row = { ...squat(), id: 'exercise-row', name: 'Row', index: 99, sets: squat().sets.map(set => ({ ...set, id: `row-${set.id}` })) }
    const added = stateOf(addWorkoutExercise(running, row))
    expect(added.session.exercises.map(item => [item.id, item.index])).toEqual([['exercise-squat', 0], ['exercise-row', 1]])
    const removed = stateOf(removeWorkoutExercise(added, 'exercise-squat'))
    expect(removed.session.exercises.map(item => [item.id, item.index])).toEqual([['exercise-row', 0]])
    expect(running.session.exercises).toHaveLength(1)
  })

  it('starts, completes and cancels rest with controlled time', () => {
    const running = stateOf(startWorkout(prepared()))
    const resting = stateOf(startWorkoutRest(running, { exerciseId: 'exercise-squat', setId: 'set-1', durationSeconds: 90 }, clock()))
    expect(resting).toMatchObject({ phase: 'resting', rest: { startedAt: '2026-07-18T10:00:00.000Z', endsAt: '2026-07-18T10:01:30.000Z' } })
    const completed = stateOf(finishWorkoutRest(resting, clock('2026-07-18T10:01:31.000Z')))
    expect(completed).toMatchObject({ phase: 'rest-complete', completedAt: '2026-07-18T10:01:31.000Z' })
    expect(stateOf(cancelWorkoutRest(completed)).phase).toBe('in-progress')
    expect(startWorkoutRest(running, { exerciseId: 'exercise-squat', setId: 'set-1', durationSeconds: 0 }, clock())).toMatchObject({ ok: false, reason: 'invalid_duration' })
  })

  it('abandons active states and refuses further edits', () => {
    const abandoned = stateOf(abandonWorkout(stateOf(startWorkout(prepared())), clock('2026-07-18T10:05:00.000Z')))
    expect(abandoned).toMatchObject({ phase: 'abandoned', abandonedAt: '2026-07-18T10:05:00.000Z' })
    expect(updateWorkoutSet(abandoned, 'exercise-squat', 'set-1', { completed: true })).toMatchObject({ ok: false, reason: 'invalid_phase' })
    expect(abandonWorkout(abandoned, clock())).toMatchObject({ ok: false, reason: 'invalid_phase' })
  })

  it('prepares the current finalization payload from completed sets only', () => {
    const running = stateOf(startWorkout(prepared()))
    const first = stateOf(updateWorkoutSet(running, 'exercise-squat', 'set-1', { completed: true, weight: 80, repetitions: 8, rir: 2 }))
    const result = prepareWorkoutFinalization(first, 60_000)
    expect(result).toEqual({ ok: true, snapshot: {
      durationMs: 60_000, completedSets: 1, totalSets: 2, totalVolume: 640,
      exercises: [{ name: 'Squat', muscle: 'Jambes', exerciseId: 'catalog-squat', setsTarget: 2, sets: [{ weight: 80, reps: 8, rir: 2 }] }],
    } })
    expect(prepareWorkoutFinalization(stateOf(abandonWorkout(first, clock())), 60_000)).toEqual({ ok: false, reason: 'invalid_phase' })
    expect(prepareWorkoutFinalization(first, -1)).toEqual({ ok: false, reason: 'invalid_input' })
  })

  it('is deterministic and does not mutate inputs across identical transition sequences', () => {
    const input = prepared()
    const before = structuredClone(input)
    const run = () => prepareWorkoutFinalization(stateOf(updateWorkoutSet(stateOf(startWorkout(input)), 'exercise-squat', 'set-1', { completed: true })), 1_000)
    expect(run()).toEqual(run())
    expect(input).toEqual(before)
  })
})
