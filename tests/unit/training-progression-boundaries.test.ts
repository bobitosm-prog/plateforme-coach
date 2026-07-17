import { describe, expect, it } from 'vitest'
import {
  computeProgression,
  getIncrementForExercise,
  parseRepsTarget,
  roundToStep,
  type PrevSessionSet,
} from '../../lib/training/compute-progression'

const set = (weight: number, reps: number, completed = true, rir: number | null = null): PrevSessionSet => ({
  weight,
  reps,
  completed,
  rir,
})

describe('Training progression boundaries', () => {
  it.each([
    ['10 reps', null],
    ['10abc', null],
    ['10-8', null],
    ['-5', null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [10.5, null],
    [' 12 ', 12],
    ['6 – 10', 6],
  ])('parses %j strictly as %j', (input, expected) => {
    expect(parseRepsTarget(input)).toBe(expected)
  })

  it('covers every increment category and the deterministic fallback', () => {
    expect(getIncrementForExercise('Romanian Deadlift')).toBe(5)
    expect(getIncrementForExercise('Overhead Press')).toBe(2.5)
    expect(getIncrementForExercise('Tractions pronation')).toBe(2.5)
    expect(getIncrementForExercise('Élévations latérales')).toBe(1.25)
    expect(getIncrementForExercise('Mouvement inconnu')).toBe(2.5)
  })

  it('returns null for non-positive or non-finite reference weights', () => {
    expect(computeProgression([[set(-10, 10)]], 10, 'Squat')).toBeNull()
    expect(computeProgression([[set(Number.NaN, 10)]], 10, 'Squat')).toBeNull()
  })

  it('uses documented minimum and maximum accelerated steps', () => {
    const isolation = computeProgression([[set(20, 12, true, 4)]], 10, 'Curl')
    const compound = computeProgression([[set(100, 10, true, 4)]], 10, 'Squat')
    expect(isolation).toMatchObject({ status: 'progress', step: 2.5, weight: 22.5 })
    expect(compound).toMatchObject({ status: 'progress', step: 7.5, weight: 107.5 })
  })

  it('deloads from the last successful target weight and rounds to the exercise step', () => {
    const result = computeProgression([[set(43, 10), set(50, 8), set(50, 4)]], 10, 'Curl')
    expect(result).toEqual({
      status: 'deload',
      weight: roundToStep(43 * 0.9, 1.25),
      reason: 'Consolide une charge plus légère',
      step: 1.25,
    })
  })

  it('detects two holds at the same working weight even with warm-up sets first', () => {
    const result = computeProgression([
      [set(20, 10), set(60, 8), set(60, 7)],
      [set(20, 10), set(60, 9), set(60, 8)],
    ], 10, 'Bench Press')
    expect(result).toMatchObject({ status: 'deload', weight: 17.5 })
  })

  it('ignores incomplete sets when evaluating RIR and target success', () => {
    const result = computeProgression([
      [set(60, 10, true, 3), set(60, 1, false, 0), set(60, 10, true, 3)],
    ], 10, 'Bench Press')
    expect(result).toMatchObject({ status: 'progress', weight: 62.5 })
  })
})
