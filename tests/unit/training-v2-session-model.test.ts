import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  ACTIVE_WORKOUT_DRAFT_VERSION,
  ACTIVE_WORKOUT_STORAGE_KEY,
  LEGACY_ACTIVE_WORKOUT_STORAGE_KEY,
  LEGACY_WORKOUT_DRAFT_STORAGE_KEY,
  createActiveWorkoutDraft,
  findNextWorkoutPosition,
  readActiveWorkoutDraft,
  updateActiveWorkoutDraft,
  writeActiveWorkoutDraft,
  type WorkoutDraftStorage,
} from '@/lib/training/active-workout-draft'

class MemoryStorage implements WorkoutDraftStorage {
  readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const now = new Date('2026-08-28T10:00:00.000Z')

function draft() {
  return createActiveWorkoutDraft({
    userId: 'user-1',
    programSource: 'personal',
    programId: 'program-1',
    sessionKey: 'program-1:lundi',
    sessionName: 'Jambes',
    trainingDay: 'lundi',
    exercises: [
      { name: 'Squat', sets: 2, reps: 8 },
      { name: 'Fentes', sets: 1, reps: 10 },
    ],
    draftId: 'stable-draft-id',
    now,
  })
}

describe('Training V2 active workout draft', () => {
  it('has a versioned contract and a stable id across persistence and refresh', () => {
    const storage = new MemoryStorage()
    const created = draft()
    writeActiveWorkoutDraft(storage, created)

    const restored = readActiveWorkoutDraft(storage, 'user-1', new Date('2026-08-28T10:05:00.000Z'))
    expect(restored?.version).toBe(ACTIVE_WORKOUT_DRAFT_VERSION)
    expect(restored?.draftId).toBe('stable-draft-id')
    expect(restored?.sessionKey).toBe('program-1:lundi')
  })

  it('persists current exercise, current set and an absolute rest deadline', () => {
    const storage = new MemoryStorage()
    const updated = updateActiveWorkoutDraft(draft(), {
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      restTimerEndAt: '2026-08-28T10:07:00.000Z',
    }, new Date('2026-08-28T10:06:00.000Z'))
    writeActiveWorkoutDraft(storage, updated)

    expect(readActiveWorkoutDraft(storage, 'user-1', new Date('2026-08-28T10:06:30.000Z'))).toMatchObject({
      currentExerciseIndex: 1,
      currentSetIndex: 0,
      restTimerEndAt: '2026-08-28T10:07:00.000Z',
    })
  })

  it('computes the next incomplete set from locally secured exercise state', () => {
    const created = draft()
    created.exercises[0].sets[0].done = true
    expect(findNextWorkoutPosition(created.exercises, 0, 0)).toEqual({
      currentExerciseIndex: 0,
      currentSetIndex: 1,
    })
  })

  it('adapts the two legacy keys once into the single V2 authority', () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify({
      name: 'Haut du corps',
      weekdayKey: 'mardi',
      startedAt: '2026-08-28T09:00:00.000Z',
    }))
    storage.setItem(LEGACY_WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify({
      sessionName: 'Haut du corps',
      startedAt: '2026-08-28T09:00:00.000Z',
      exos: [{ name: 'Row', sets: [{ num: 1, weight: 40, reps: 10, done: true }] }],
    }))

    const restored = readActiveWorkoutDraft(storage, 'user-1', now)
    expect(restored?.version).toBe(2)
    expect(restored?.exercises[0].sets[0].done).toBe(true)
    expect(storage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(LEGACY_WORKOUT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('rejects invalid and expired drafts safely', () => {
    const invalid = new MemoryStorage()
    invalid.setItem(ACTIVE_WORKOUT_STORAGE_KEY, '{bad json')
    expect(readActiveWorkoutDraft(invalid, 'user-1', now)).toBeNull()

    const expired = new MemoryStorage()
    writeActiveWorkoutDraft(expired, draft())
    expect(readActiveWorkoutDraft(expired, 'user-1', new Date('2026-08-30T10:00:01.000Z'))).toBeNull()
    expect(expired.getItem(ACTIVE_WORKOUT_STORAGE_KEY)).toBeNull()
  })

  it('turns an interrupted saving state into an explicit retry state after reload', () => {
    const storage = new MemoryStorage()
    writeActiveWorkoutDraft(storage, updateActiveWorkoutDraft(draft(), { status: 'saving' }, now))

    expect(readActiveWorkoutDraft(storage, 'user-1', new Date('2026-08-28T10:01:00.000Z'))).toMatchObject({
      status: 'save_error',
      errorCode: 'WORKOUT_SAVE_INTERRUPTED',
    })
  })

  it('wires start, set validation and refresh restoration to the V2 draft', () => {
    const hook = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
    const session = readFileSync('app/components/WorkoutSession.tsx', 'utf8')
    expect(hook).toContain('const restored = readActiveWorkoutDraft(localStorage, session.user.id)')
    expect(hook).toContain('const draft = createActiveWorkoutDraft({')
    expect(hook).toContain('writeActiveWorkoutDraft(localStorage, draft)')
    expect(session).toMatch(/const doValidate[\s\S]*persistDraft\(\{[\s\S]*findNextWorkoutPosition/)
    expect(session).toContain('Réessayer')
  })
})
