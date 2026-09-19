import { expect, it } from 'vitest'
import { prescribedDuration, isTimedHold } from '@/lib/training/exercise-measurement'
import { normalizeWorkoutDraftExercises } from '@/lib/training/active-workout-draft'

it('recognizes static holds without turning dynamic planks into holds', () => {
  expect(isTimedHold('Planche latérale')).toBe(true)
  expect(isTimedHold('Planche dynamique')).toBe(false)
  expect(isTimedHold('Plank shoulder taps')).toBe(false)
  expect(prescribedDuration({ name: 'Planche', reps: 12 })).toBe(30)
  expect(prescribedDuration({ name: 'Planche', duration_seconds: 45 })).toBe(45)
})
it('preserves seconds across draft resume and never converts legacy reps to elapsed seconds', () => {
  const [draft] = normalizeWorkoutDraftExercises([{ name: 'Planche', sets: 3, reps: 12 }])
  expect(draft.targetDurationSeconds).toBe(30)
  expect(draft.sets[0].durationSeconds).toBeUndefined()
  draft.sets[0].durationSeconds = 35
  draft.sets[0].done = true
  expect(normalizeWorkoutDraftExercises([draft])[0].sets[0].durationSeconds).toBe(35)
})
