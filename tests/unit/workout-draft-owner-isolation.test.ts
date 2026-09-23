import { describe, expect, it } from 'vitest'
import { ACTIVE_WORKOUT_STORAGE_KEY, LEGACY_ACTIVE_WORKOUT_STORAGE_KEY, createActiveWorkoutDraft, readActiveWorkoutDraft, writeActiveWorkoutDraft, removeActiveWorkoutDraft, workoutDraftStorageKey } from '@/lib/training/active-workout-draft'

const now = new Date('2026-09-23T11:00:00Z')
function storage() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) } }
}
function draft(userId = 'A', draftId = 'first') {
  const d = createActiveWorkoutDraft({ userId, draftId, now, programSource: 'personal', programId: 'p', sessionKey: 's', sessionName: 'Synthetic', exercises: [{name: 'Squat', sets: 3, reps: 10}] })
  d.exercises[0].sets[0].done = true
  d.exercises[0].sets[1].done = true
  return d
}

describe('workout owner-scoped storage', () => {
  it('retains A and B drafts independently across A→B→A', () => {
    const s = storage()
    writeActiveWorkoutDraft(s, draft())
    expect(readActiveWorkoutDraft(s, 'B', now)).toBeNull()
    writeActiveWorkoutDraft(s, draft('B', 'second'))
    expect(readActiveWorkoutDraft(s, 'A', now)?.exercises[0].sets.filter(x => x.done)).toHaveLength(2)
    expect(readActiveWorkoutDraft(s, 'B', now)?.draftId).toBe('second')
  })
  it('leaves a shared foreign draft untouched, then migrates only for its owner', () => {
    const s = storage(), d = draft(), raw = JSON.stringify(d)
    s.setItem(ACTIVE_WORKOUT_STORAGE_KEY, raw)
    expect(readActiveWorkoutDraft(s, 'B', now)).toBeNull()
    expect(s.getItem(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(raw)
    expect(readActiveWorkoutDraft(s, 'A', now)?.draftId).toBe(d.draftId)
    expect(s.getItem(ACTIVE_WORKOUT_STORAGE_KEY)).toBeNull()
    expect(s.getItem(workoutDraftStorageKey('A'))).toBe(raw)
  })
  it('preserves shared data when migration hits a quota error', () => {
    const s = storage(), raw = JSON.stringify(draft())
    s.setItem(ACTIVE_WORKOUT_STORAGE_KEY, raw)
    expect(() => readActiveWorkoutDraft({...s, setItem: () => { throw new Error('QuotaExceeded') }}, 'A', now)).toThrow('QuotaExceeded')
    expect(s.getItem(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(raw)
  })
  it('never assigns unowned ancient data to the current account', () => {
    const s = storage(), raw = JSON.stringify({name: 'Unknown owner', startedAt: now.toISOString(), exercises: []})
    s.setItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY, raw)
    expect(readActiveWorkoutDraft(s, 'A', now)).toBeNull()
    expect(s.getItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY)).toBe(raw)
  })
  it('requires the matching owner and draft ID to discard', () => {
    const s = storage()
    writeActiveWorkoutDraft(s, draft())
    expect(removeActiveWorkoutDraft(s, 'first', 'B')).toBe(false)
    expect(removeActiveWorkoutDraft(s, 'other', 'A')).toBe(false)
    expect(readActiveWorkoutDraft(s, 'A', now)?.draftId).toBe('first')
  })
  it('blocks resurrection and delayed writes/deletes from an older session', () => {
    const s = storage(), old = draft(), next = draft('A', 'next')
    writeActiveWorkoutDraft(s, old)
    expect(removeActiveWorkoutDraft(s, old.draftId, old.userId)).toBe(true)
    expect(writeActiveWorkoutDraft(s, old)).toBe(false)
    expect(readActiveWorkoutDraft(s, 'A', now)).toBeNull()
    expect(writeActiveWorkoutDraft(s, next, {create:true})).toBe(true)
    expect(writeActiveWorkoutDraft(s, old)).toBe(false)
    expect(removeActiveWorkoutDraft(s, old.draftId, old.userId)).toBe(false)
    expect(readActiveWorkoutDraft(s, 'A', now)?.draftId).toBe('next')
  })
  it('does not resurrect a shared legacy draft after scoped removal', () => {
    const s = storage(), d = draft()
    writeActiveWorkoutDraft(s, d)
    removeActiveWorkoutDraft(s, d.draftId, d.userId)
    s.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(d))
    expect(readActiveWorkoutDraft(s, 'A', now)).toBeNull()
    expect(s.getItem(workoutDraftStorageKey('A'))).not.toContain('exercises')
  })
  it('rejects an older snapshot of the same session', () => {
    const s = storage(), d = draft()
    writeActiveWorkoutDraft(s, {...d, updatedAt:'2026-09-23T11:01:00Z'})
    expect(writeActiveWorkoutDraft(s, d)).toBe(false)
  })
  it('does not overwrite an active session through explicit creation', () => {
    const s = storage()
    writeActiveWorkoutDraft(s, draft())
    expect(writeActiveWorkoutDraft(s, draft('A', 'next'), {create:true})).toBe(false)
  })
  it('permits a fresh session after expiry without exposing an expired draft', () => {
    const s = storage(), old = draft(), next = {...draft('A', 'next'), updatedAt: '2026-09-25T12:00:00Z'}
    writeActiveWorkoutDraft(s, old)
    expect(readActiveWorkoutDraft(s, 'A', new Date(next.updatedAt))).toBeNull()
    expect(writeActiveWorkoutDraft(s, next, {create:true})).toBe(true)
  })
})
