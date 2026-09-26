import { describe, expect, it } from 'vitest'
import { ACTIVE_WORKOUT_STORAGE_KEY, createActiveWorkoutDraft, readActiveWorkoutDraft, writeActiveWorkoutDraft } from '@/lib/training/active-workout-draft'

// Characterization of existing behavior, not a desired retention policy.
describe('draft-loss diagnostic with synthetic accounts', () => {
  it('demonstrates that reading as another user removes the original user draft', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    }
    const now = new Date('2026-09-23T11:00:00Z')
    const draft = createActiveWorkoutDraft({ userId: 'synthetic-A', programSource: 'personal', programId: 'synthetic-program', sessionKey: 'synthetic-session', sessionName: 'Synthetic only', exercises: [{name: 'Synthetic squat', sets: 3, reps: 10}], now, draftId: 'synthetic-draft' })
    draft.exercises[0].sets[0].done = true
    draft.exercises[0].sets[1].done = true
    writeActiveWorkoutDraft(storage, draft)
    expect(readActiveWorkoutDraft(storage, 'synthetic-A', now)?.exercises[0].sets.filter(set => set.done)).toHaveLength(2)
    expect(readActiveWorkoutDraft(storage, 'synthetic-B', now)).toBeNull()
    expect(values.has(ACTIVE_WORKOUT_STORAGE_KEY)).toBe(false)
    expect(readActiveWorkoutDraft(storage, 'synthetic-A', now)).toBeNull()
  })
})
