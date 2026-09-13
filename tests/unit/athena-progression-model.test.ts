import { describe, expect, it } from 'vitest'
import {
  deriveProgressionDecision,
  parseRepetitionRange,
  type ProgressionHistorySet,
  type ProgressionModelInput,
} from '@/lib/athena/progression-model'

const NOW = new Date('2026-09-13T12:00:00.000Z')

function historySession(id: string, overrides: Partial<ProgressionHistorySet> = {}): ProgressionHistorySet[] {
  return Array.from({ length: 3 }, () => ({
    sessionId: id,
    completed: true,
    sessionCompleted: true,
    weight: 40,
    reps: 12,
    rir: 2,
    createdAt: `2026-09-${id === 'one' ? '10' : '12'}T10:00:00.000Z`,
    ...overrides,
  }))
}

function input(overrides: Partial<ProgressionModelInput> = {}): ProgressionModelInput {
  return {
    currentWeight: 40,
    currentReps: 10,
    setsCompleted: 3,
    setsTarget: 3,
    targetReps: '8-12',
    currentRirs: [2, 2, 2],
    history: [...historySession('one'), ...historySession('two')],
    now: NOW,
    ...overrides,
  }
}

describe('Athena progression model', () => {
  it.each([
    ['8-12', { minimum: 8, maximum: 12 }],
    ['12–8', { minimum: 8, maximum: 12 }],
    ['10', { minimum: 10, maximum: 10 }],
  ])('parses repetition range %s', (raw, expected) => {
    expect(parseRepetitionRange(raw)).toEqual(expected)
  })

  it.each(['', 'abc', '0-10', '8-40'])('rejects invalid repetition range %s', raw => {
    expect(parseRepetitionRange(raw)).toBeNull()
  })

  it('uses rep progression before load progression', () => {
    expect(deriveProgressionDecision(input())).toMatchObject({
      action: 'increase_reps',
      suggestedWeight: 40,
      suggestedReps: 11,
      confidence: 'standard',
    })
  })

  it('holds when median RIR is at or below one', () => {
    expect(deriveProgressionDecision(input({ currentRirs: [0, 1, 1] }))).toEqual({
      action: 'hold',
      reason: 'near_failure',
    })
  })

  it('requires two repeated upper-range exposures before a small load increase', () => {
    const decision = deriveProgressionDecision(input({ currentReps: 12 }))

    expect(decision).toMatchObject({
      action: 'increase_load',
      suggestedWeight: 41,
      suggestedReps: 8,
      confidence: 'standard',
      evidenceSessions: 2,
    })
  })

  it('requires three exposures and lowers confidence when RIR is absent', () => {
    expect(deriveProgressionDecision(input({
      currentReps: 12,
      currentRirs: [null, null, null],
    }))).toEqual({ action: 'hold', reason: 'insufficient_repeated_exposures' })

    const third = historySession('three', { createdAt: '2026-09-13T10:00:00.000Z', rir: null })
    expect(deriveProgressionDecision(input({
      currentReps: 12,
      currentRirs: [null, null, null],
      history: [...input().history, ...third],
    }))).toMatchObject({ action: 'increase_load', confidence: 'reduced', evidenceSessions: 3 })
  })

  it('ignores incomplete sets, incomplete sessions, old and future timestamps', () => {
    const invalidHistory = [
      ...historySession('one', { completed: false }),
      ...historySession('two', { sessionCompleted: false }),
      ...historySession('old', { createdAt: '2026-01-01T10:00:00.000Z' }),
      ...historySession('future', { createdAt: '2026-09-14T10:00:00.000Z' }),
    ]
    expect(deriveProgressionDecision(input({ currentReps: 12, history: invalidHistory }))).toEqual({
      action: 'hold',
      reason: 'insufficient_repeated_exposures',
    })
  })

  it('does not progress incomplete work or an unknown target range', () => {
    expect(deriveProgressionDecision(input({ setsCompleted: 2 }))).toEqual({ action: 'hold', reason: 'invalid_input' })
    expect(deriveProgressionDecision(input({ targetReps: null }))).toEqual({ action: 'hold', reason: 'target_range_missing' })
  })

  it('never produces the former arbitrary five-kilogram jump', () => {
    const decision = deriveProgressionDecision(input({ currentReps: 12 }))
    expect(decision.action).toBe('increase_load')
    if (decision.action === 'increase_load') {
      expect(decision.suggestedWeight - 40).toBeLessThanOrEqual(1)
      expect(decision.suggestedWeight).toBe(41)
    }
  })
})
