import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const route = readFileSync('app/api/suggest-overload/route.ts', 'utf8')
const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
const workout = readFileSync('app/components/WorkoutSession.tsx', 'utf8')

describe('Athena progression integration', () => {
  it('uses the deterministic progression model without an LLM', () => {
    expect(route).toContain('deriveProgressionDecision')
    expect(route).not.toMatch(/anthropic|claude|api\.anthropic\.com/i)
  })

  it('limits evidence to completed sets from completed sessions', () => {
    expect(route).toContain(".eq('completed', true)")
    expect(route).toContain(".eq('workout_sessions.completed', true)")
    expect(route).toContain('workout_sessions!inner(completed)')
  })

  it('passes stable exercise identity, prescription and effort signals', () => {
    expect(dashboard).toContain('exerciseId: exercise.exerciseId ?? null')
    expect(dashboard).toContain('targetReps: exercise.targetReps ?? null')
    expect(dashboard).toContain('currentRirs: exercise.sets.map(set => set.rir ?? null)')
    expect(dashboard).toContain('await Promise.all(overloadRequests)')
    expect(workout).toContain('targetReps: e.targetReps')
  })

  it('does not expose database diagnostics in overload responses', () => {
    expect(route).not.toContain('details:')
    expect(route).not.toContain('insertError.message')
    expect(route).not.toContain('historyError.message')
  })
})
