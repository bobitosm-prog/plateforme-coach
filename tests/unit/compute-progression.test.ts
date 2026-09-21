import { describe, expect, it } from 'vitest'
import { computeProgression as derive, parseRepsTarget, roundToStep, type PrevSessionSet } from '../../lib/training/compute-progression'

const now = new Date('2026-09-21T12:00:00Z')
const computeProgression = (sessions: PrevSessionSet[][], target: unknown) => derive(sessions, target, { setsTarget: 3, now })
const set = (weight: number, reps: number, rir: number | null = 2, completed = true): PrevSessionSet => ({ weight, reps, rir, completed, createdAt:'2026-09-20T12:00:00Z' })
const session = (weight: number, reps: number, rir: number | null = 2) => Array.from({ length: 3 }, () => set(weight, reps, rir))

describe('session progression adapter', () => {
  it.each([['10', 10], ['10-12', 10], ['8–12', 8], ['AMRAP', null], [null, null]])('parses %s', (value, expected) => expect(parseRepsTarget(value)).toBe(expected))
  it('increases repetitions before load', () => expect(computeProgression([session(60, 10)], '8-12')).toMatchObject({ action: 'increase_reps', weight: 60, reps: 11, step: 0 }))
  it('does not increase load after one exposure', () => expect(computeProgression([session(60, 12)], '8-12')).toMatchObject({ action: 'hold', weight: 60 }))
  it('uses repeated evidence for load', () => expect(computeProgression([session(60, 12), session(60, 12)], '8-12')).toMatchObject({ action: 'increase_load', weight: 61.5, reps: 8, step: 1.5 }))
  it('requires three confirmations without RIR', () => {
    expect(computeProgression([session(60, 12, null), session(60, 12, null)], '8-12')).toMatchObject({ action: 'hold' })
    expect(computeProgression([session(60, 12, null), session(60, 12, null), session(60, 12, null)], '8-12')).toMatchObject({ action: 'increase_load' })
  })
  it('holds near failure', () => expect(computeProgression([session(60, 10, 1)], '8-12')).toMatchObject({ action: 'hold' }))
  it('does not prescribe from mixed weights', () => expect(computeProgression([[set(40, 12), set(60, 12), set(60, 12)]], '8-12')).toMatchObject({ action: 'hold', step: 0 }))
  it('ignores unusable history', () => {
    expect(computeProgression([[set(60, 12, 2, false)]], '8-12')).toBeNull()
    expect(computeProgression([], '8-12')).toBeNull()
  })
  it('does not invent bodyweight load or AMRAP targets', () => {
    expect(computeProgression([session(0, 12)], '8-12')).toBeNull()
    expect(computeProgression([session(60, 12)], 'AMRAP')).toBeNull()
  })
  it('retains deterministic rounding', () => expect(roundToStep(58.5, 2.5)).toBe(57.5))
  it('holds a partial session instead of changing the required set count', () => {
    expect(derive([[set(60,12),set(60,12)]], '8-12', {setsTarget:3,now})).toMatchObject({action:'hold'})
  })
  it('does not manufacture evidence dates', () => {
    expect(derive([[{...set(60,12),createdAt:null}]],'8-12',{setsTarget:1,now})).toBeNull()
    expect(derive([[{...set(60,12),createdAt:'2026-01-01T12:00:00Z'}]],'8-12',{setsTarget:1,now})).toBeNull()
  })
})
