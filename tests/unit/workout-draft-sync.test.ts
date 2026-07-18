import { describe, expect, it } from 'vitest'
import {
  discardWorkoutDraftSnapshot, restoreWorkoutDraftSnapshot, saveWorkoutDraftSnapshot,
} from '../../lib/training/workout-draft-sync'
import { WORKOUT_DRAFT_STORAGE_KEY } from '../../lib/training/workout-session-storage'

function storage(throws = false) {
  const entries = new Map<string, string>()
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem(key: string, value: string) { if (throws) throw new Error('private storage detail'); entries.set(key, value) },
    removeItem(key: string) { if (throws) throw new Error('private storage detail'); entries.delete(key) },
  }
}

const clock = { now: () => new Date('2026-07-18T12:00:00.000Z') }

describe('workout draft synchronization', () => {
  it('saves and restores a deterministic immutable draft envelope', () => {
    const target = storage()
    const exos = [{ id: 'squat', sets: [{ done: true }] }]
    const before = structuredClone(exos)
    expect(saveWorkoutDraftSnapshot(target, { sessionName: 'Jambes', exos }, clock)).toEqual({ ok: true })
    expect(restoreWorkoutDraftSnapshot(target, 'Jambes', clock)).toEqual({
      sessionName: 'Jambes', startedAt: '2026-07-18T12:00:00.000Z',
      savedAt: '2026-07-18T12:00:00.000Z', exos,
    })
    expect(exos).toEqual(before)
  })

  it('preserves an existing startedAt and rejects a different session name', () => {
    const target = storage()
    saveWorkoutDraftSnapshot(target, { sessionName: 'Jambes', startedAt: '2026-07-18T10:00:00.000Z', exos: [] }, clock)
    expect(restoreWorkoutDraftSnapshot(target, 'Dos', clock)).toBeNull()
    expect(restoreWorkoutDraftSnapshot(target, 'Jambes', clock)?.startedAt).toBe('2026-07-18T10:00:00.000Z')
  })

  it('discards the draft and expurgates unavailable storage', () => {
    const target = storage()
    target.entries.set(WORKOUT_DRAFT_STORAGE_KEY, '{}')
    expect(discardWorkoutDraftSnapshot(target)).toEqual({ ok: true })
    expect(target.entries.has(WORKOUT_DRAFT_STORAGE_KEY)).toBe(false)
    expect(saveWorkoutDraftSnapshot(storage(true), { sessionName: 'Test', exos: [] }, clock)).toEqual({ ok: false, reason: 'storage_unavailable' })
    expect(discardWorkoutDraftSnapshot(storage(true))).toEqual({ ok: false, reason: 'storage_unavailable' })
  })
})
