import { describe, expect, it } from 'vitest'
import {
  ACTIVE_WORKOUT_STORAGE_KEY,
  WORKOUT_DRAFT_MAX_AGE_MS,
  WORKOUT_DRAFT_STORAGE_KEY,
  clearActiveWorkout,
  clearWorkoutDraft,
  readActiveWorkout,
  readWorkoutDraft,
  writeActiveWorkout,
  writeWorkoutDraft,
  type WorkoutStorage,
} from '../../lib/training/workout-session-storage'

function memoryStorage(seed: Record<string, string> = {}): WorkoutStorage & { entries: Map<string, string> } {
  const entries = new Map(Object.entries(seed))
  return {
    entries,
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value) },
    removeItem: key => { entries.delete(key) },
  }
}

describe('workout session local persistence transitions', () => {
  it('represents no active session and no draft without touching storage', () => {
    const storage = memoryStorage()
    expect(readActiveWorkout(storage)).toBeNull()
    expect(readWorkoutDraft(storage, 'Jambes', Date.UTC(2026, 6, 18))).toBeNull()
    expect(storage.entries.size).toBe(0)
  })

  it('persists and restores a scheduled or free active workout without mutating it', () => {
    const storage = memoryStorage()
    const scheduled = Object.freeze({ name: 'Jambes', exercises: Object.freeze([{ name: 'Squat' }]), startedAt: '2026-07-18T08:00:00.000Z', weekdayKey: 'samedi' })
    writeActiveWorkout(storage, scheduled)
    expect(storage.entries.has(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(true)
    expect(readActiveWorkout(storage)).toEqual(scheduled)
    expect(scheduled.exercises).toEqual([{ name: 'Squat' }])

    const free = { name: 'Séance libre', exercises: [], startedAt: '2026-07-18T09:00:00.000Z' }
    writeActiveWorkout(storage, free)
    expect(readActiveWorkout(storage)).toEqual(free)
  })

  it('persists series progress and restores the matching fresh draft deterministically', () => {
    const now = Date.UTC(2026, 6, 18, 12)
    const storage = memoryStorage()
    const exos = [{ name: 'Squat', sets: [{ weight: 80, reps: 8, done: true }] }]
    const before = structuredClone(exos)
    const draft = { sessionName: 'Jambes', startedAt: '2026-07-18T11:00:00.000Z', savedAt: new Date(now - 1_000).toISOString(), exos }
    writeWorkoutDraft(storage, draft)
    expect(storage.entries.has(WORKOUT_DRAFT_STORAGE_KEY)).toBe(true)
    expect(readWorkoutDraft(storage, 'Jambes', now)).toEqual(draft)
    expect(exos).toEqual(before)
  })

  it.each([
    ['invalid JSON', '{'],
    ['missing exercises', JSON.stringify({ sessionName: 'Jambes', savedAt: '2026-07-18T11:00:00.000Z' })],
  ])('isolates an incomplete cache: %s', (_label, raw) => {
    const storage = memoryStorage({ [WORKOUT_DRAFT_STORAGE_KEY]: raw })
    expect(readWorkoutDraft(storage, 'Jambes', Date.UTC(2026, 6, 18, 12))).toBeNull()
  })

  it('characterizes the current acceptance of an invalid savedAt value', () => {
    const storage = memoryStorage({
      [WORKOUT_DRAFT_STORAGE_KEY]: JSON.stringify({ sessionName: 'Jambes', savedAt: 'invalid', exos: [] }),
    })
    expect(readWorkoutDraft(storage, 'Jambes', Date.UTC(2026, 6, 18, 12))).toEqual({ sessionName: 'Jambes', savedAt: 'invalid', exos: [] })
  })

  it('rejects another name and a draft older than 24 hours', () => {
    const now = Date.UTC(2026, 6, 18, 12)
    const storage = memoryStorage()
    writeWorkoutDraft(storage, {
      sessionName: 'Jambes', startedAt: '2026-07-17T10:00:00.000Z',
      savedAt: new Date(now - WORKOUT_DRAFT_MAX_AGE_MS - 1).toISOString(), exos: [],
    })
    expect(readWorkoutDraft(storage, 'Dos', now)).toBeNull()
    expect(readWorkoutDraft(storage, 'Jambes', now)).toBeNull()
  })

  it('characterizes the current owner gap without attaching or inferring an identity', () => {
    const storage = memoryStorage()
    writeActiveWorkout(storage, { name: 'Jambes', exercises: [] })
    writeWorkoutDraft(storage, { sessionName: 'Jambes', startedAt: '2026-07-18T08:00:00.000Z', savedAt: '2026-07-18T08:01:00.000Z', exos: [] })
    expect(storage.entries.get(ACTIVE_WORKOUT_STORAGE_KEY)).not.toContain('userId')
    expect(storage.entries.get(WORKOUT_DRAFT_STORAGE_KEY)).not.toContain('userId')
  })

  it('clears both caches explicitly on completion or abandonment', () => {
    const storage = memoryStorage({ [ACTIVE_WORKOUT_STORAGE_KEY]: '{}', [WORKOUT_DRAFT_STORAGE_KEY]: '{}' })
    clearActiveWorkout(storage)
    clearWorkoutDraft(storage)
    expect(storage.entries.size).toBe(0)
  })
})
