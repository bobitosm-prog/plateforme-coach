import { describe, it, expect } from 'vitest'
import {
  parseRepsTarget,
  computeProgression,
  getIncrementForExercise,
  roundToStep,
  type PrevSessionSet,
} from '../../lib/training/compute-progression'

// ── parseRepsTarget ──

describe('parseRepsTarget', () => {
  it('"10" → 10', () => expect(parseRepsTarget('10')).toBe(10))
  it('"10-12" → 10 (plancher)', () => expect(parseRepsTarget('10-12')).toBe(10))
  it('"8-12" → 8', () => expect(parseRepsTarget('8-12')).toBe(8))
  it('"AMRAP" → null', () => expect(parseRepsTarget('AMRAP')).toBeNull())
  it('null → null', () => expect(parseRepsTarget(null)).toBeNull())
  it('undefined → null', () => expect(parseRepsTarget(undefined)).toBeNull())
  it('"" → null', () => expect(parseRepsTarget('')).toBeNull())
  it('10 (number) → 10', () => expect(parseRepsTarget(10)).toBe(10))
  it('0 (number) → null', () => expect(parseRepsTarget(0)).toBeNull())
  it('"8–12" (en-dash) → 8', () => expect(parseRepsTarget('8–12')).toBe(8))
})

// ── roundToStep ──

describe('roundToStep', () => {
  it('58.5 step 2.5 → 57.5', () => expect(roundToStep(58.5, 2.5)).toBe(57.5))
  it('58.5 step 1.25 → 58.75', () => expect(roundToStep(58.5, 1.25)).toBe(58.75))
  it('60 step 5 → 60', () => expect(roundToStep(60, 5)).toBe(60))
  it('63 step 5 → 65', () => expect(roundToStep(63, 5)).toBe(65))
  it('54 step 2.5 → 55 (deload 60×0.9)', () => expect(roundToStep(54, 2.5)).toBe(55))
  it('72 step 5 → 70', () => expect(roundToStep(72, 5)).toBe(70))
})

// ── computeProgression ──

describe('computeProgression', () => {
  const s = (weight: number, reps: number, completed = true): PrevSessionSet => ({ weight, reps, completed })

  // ── Progress ──

  it('progress: 3×12 target 10 → +step', () => {
    const result = computeProgression(
      [[s(75, 12), s(75, 12), s(75, 12)]],
      10, 'Développé couché'
    )
    expect(result).not.toBeNull()
    expect(result!.status).toBe('progress')
    expect(result!.weight).toBe(77.5) // 75 + 2.5
    expect(result!.step).toBe(2.5)
  })

  it('progress: 3×10 target 10 → progress (cible = plancher)', () => {
    const result = computeProgression(
      [[s(80, 10), s(80, 10), s(80, 10)]],
      10, 'Squat'
    )
    expect(result!.status).toBe('progress')
    expect(result!.weight).toBe(85) // 80 + 5 (compound)
  })

  it('step compound 5kg: Squat target atteint → +5kg', () => {
    const result = computeProgression(
      [[s(100, 10), s(100, 10), s(100, 10)]],
      10, 'Squat Barre'
    )
    expect(result!.weight).toBe(105)
    expect(result!.step).toBe(5)
  })

  it('step isolation 1.25kg: Curl target atteint → +1.25kg', () => {
    const result = computeProgression(
      [[s(20, 12), s(20, 12), s(20, 12)]],
      10, 'Curl Biceps'
    )
    expect(result!.weight).toBe(21.25)
    expect(result!.step).toBe(1.25)
  })

  // ── Hold ──

  it('hold simple: sets [10,8,7] target 10, pas d historique → hold', () => {
    const result = computeProgression(
      [[s(60, 10), s(60, 8), s(60, 7)]],
      10, 'Bench Press'
    )
    expect(result!.status).toBe('hold')
    expect(result!.weight).toBe(60)
  })

  it('hold avec session N-1 à poids différent → reste hold', () => {
    const result = computeProgression(
      [
        [s(60, 10), s(60, 8), s(60, 7)],
        [s(55, 10), s(55, 9), s(55, 8)],
      ],
      10, 'Bench Press'
    )
    expect(result!.status).toBe('hold')
    expect(result!.weight).toBe(60)
  })

  // ── Deload ──

  it('deload mauvais set: sets [10,10,4] target 10 → deload -10%', () => {
    const result = computeProgression(
      [[s(100, 10), s(100, 10), s(100, 4)]],
      10, 'Squat'
    )
    expect(result!.status).toBe('deload')
    expect(result!.weight).toBe(90) // floor(100*0.9 / 5) * 5 = 90
    expect(result!.reason).toContain('légère')
  })

  it('deload stagnation: 2 sessions consécutives hold au même poids → deload', () => {
    const result = computeProgression(
      [
        [s(60, 10), s(60, 8), s(60, 7)],
        [s(60, 10), s(60, 9), s(60, 8)],
      ],
      10, 'Bench Press'
    )
    expect(result!.status).toBe('deload')
    expect(result!.reason).toContain('bloquées')
  })

  // ── Edge cases ──

  it('bodyweight: weight=0 → null', () => {
    const result = computeProgression(
      [[s(0, 15), s(0, 12), s(0, 10)]],
      10, 'Pompes'
    )
    expect(result).toBeNull()
  })

  it('première fois: prevSessions=[] → null', () => {
    expect(computeProgression([], 10, 'Squat')).toBeNull()
  })

  it('target null (AMRAP) → null', () => {
    expect(computeProgression([[s(80, 12)]], null, 'Squat')).toBeNull()
  })

  it('séance abandonnée: tous completed=false → null', () => {
    const result = computeProgression(
      [[s(80, 10, false), s(80, 8, false), s(80, 6, false)]],
      10, 'Squat'
    )
    expect(result).toBeNull()
  })

  it('mix completed: [10✓, 8✗, 6✓] target 10 → hold (calcul sur 2 completed)', () => {
    const result = computeProgression(
      [[s(60, 10, true), s(60, 8, false), s(60, 6, true)]],
      10, 'Bench Press'
    )
    // Completed sets: [10, 6]. 6 >= 5 so no failed set, but 6 < 10 so not all reached target → hold
    expect(result!.status).toBe('hold')
    expect(result!.weight).toBe(60)
  })

  // ── Progressive weight / warmup sets ──

  it('warmup sets: [43x10, 50x10, 50x10] target 10 → progress, refWeight=50', () => {
    const result = computeProgression(
      [[s(43, 10), s(50, 10), s(50, 10)]],
      10, 'Curl Biceps'
    )
    expect(result!.status).toBe('progress')
    expect(result!.weight).toBe(51.25) // 50 + 1.25
  })

  it('warmup + partial: [50x10, 50x10, 50x8] target 10 → hold, refWeight=50', () => {
    const result = computeProgression(
      [[s(50, 10), s(50, 10), s(50, 8)]],
      10, 'Curl Biceps'
    )
    expect(result!.status).toBe('hold')
    expect(result!.weight).toBe(50)
  })

  it('all failed reps: [50x4, 50x3, 50x2] target 10 → deload, refWeight=50 (max global)', () => {
    const result = computeProgression(
      [[s(50, 4), s(50, 3), s(50, 2)]],
      10, 'Curl Biceps'
    )
    expect(result!.status).toBe('deload')
    expect(result!.weight).toBe(roundToStep(50 * 0.9, 1.25)) // 45
  })

  it('warmup OK + failed heavy: [43x10, 50x8, 50x4] target 10 → deload, refWeight=43 (set a cible)', () => {
    const result = computeProgression(
      [[s(43, 10), s(50, 8), s(50, 4)]],
      10, 'Curl Biceps'
    )
    // set <5 reps → deload. refWeight = max of sets at target = 43
    expect(result!.status).toBe('deload')
    expect(result!.weight).toBe(roundToStep(43 * 0.9, 1.25)) // 38.75
  })
})
