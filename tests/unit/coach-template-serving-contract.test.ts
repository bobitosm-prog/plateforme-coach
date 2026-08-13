import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PaginatedResult } from '../../lib/repositories/pagination'
import type { CoachProgramRow } from '../../lib/repositories/training/program'
import { adaptCoachTemplate } from '../../lib/training/adapters'
import type { AdapterContext, AdapterResult, TrainingProgram } from '../../lib/training/model'
import {
  COACH_TEMPLATE_SERVING_DEFAULT_MODE,
  createCoachTemplateCanonicalServingValidationControl,
  observeCoachTemplateServingDecisions,
  prepareCoachTemplatePageForServing,
  toCoachTemplateServingDecisionTelemetry,
} from '../../lib/training/coexistence/coach-template-serving-contract'

const row = (id: string, program: unknown = {
  days: [{
    name: 'Push',
    exercises: [
      { exercise_id: 'bench', name: 'Développé couché', sets: 3, reps: '8-12', rest: 90 },
      { exercise_id: 'pushup', name: 'Pompes', sets: 2, reps: 'AMRAP', rest: 60 },
    ],
  }],
}): CoachProgramRow => ({
  id,
  coach_id: 'coach-1',
  name: `Template ${id}`,
  description: 'Description',
  is_template: true,
  tags: ['PPL', 'Force'],
  program: program as CoachProgramRow['program'],
  created_at: '2026-08-13T10:00:00.000Z',
})

const page = (items: readonly CoachProgramRow[]): PaginatedResult<CoachProgramRow> => ({
  items,
  hasMore: true,
  nextCursor: 'opaque-next-cursor',
})

const adapterWith = (mutate: (program: TrainingProgram) => void) => (
  input: unknown,
  context: AdapterContext,
): AdapterResult<TrainingProgram> => {
  const result = adaptCoachTemplate(input, context)
  if (result.status !== 'converted') return result
  const value = structuredClone(result.value)
  mutate(value)
  return { ...result, value }
}

describe('future coach-template canonical serving contract', () => {
  it('keeps legacy-only as the default and returns the original page for an immediate rollback', () => {
    const input = page([row('template-1')])
    const result = prepareCoachTemplatePageForServing(input, 'coach-1')
    expect(COACH_TEMPLATE_SERVING_DEFAULT_MODE).toBe('legacy-only')
    expect(result.page).toBe(input)
    expect(result.page.items[0]).toBe(input.items[0])
    expect(result.decisions).toEqual([{
      id: 'template-1', source: 'legacy-fallback', reason: 'ROLLBACK_LEGACY_ONLY',
    }])
  })

  it('presents a semantically matching canonical template with the exact fields consumed by the legacy UI', () => {
    const input = row('template-1')
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical')
    expect(result.decisions).toEqual([{ id: 'template-1', source: 'canonical', shadowResult: 'MATCH' }])
    expect(result.page.items[0]).not.toBe(input)
    expect(result.page.items[0]).toEqual(input)
  })

  it('creates an explicit validation-only activation without changing the default mode', () => {
    expect(createCoachTemplateCanonicalServingValidationControl()).toEqual({
      mode: 'canonical-when-identical',
      dependencies: {},
    })
    expect(COACH_TEMPLATE_SERVING_DEFAULT_MODE).toBe('legacy-only')
  })

  it('preserves page order, cursor and hasMore without mutating either page', () => {
    const input = page([row('template-2'), row('template-1')])
    const snapshot = structuredClone(input)
    const result = prepareCoachTemplatePageForServing(input, 'coach-1', 'canonical-when-identical')
    expect(result.page.items.map(item => item.id)).toEqual(['template-2', 'template-1'])
    expect(result.page.hasMore).toBe(true)
    expect(result.page.nextCursor).toBe('opaque-next-cursor')
    expect(input).toEqual(snapshot)
  })

  it('falls back by identity for WARNING rows carrying legacy-only displayed fields', () => {
    const input = row('warning', {
      split: 'PPL',
      duration: '8 semaines',
      days: [{ name: 'Push', exercises: [{ name: 'Pompes', sets: 2, reps: 'AMRAP', rest: 60 }] }],
    })
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical')
    expect(result.page.items[0]).toBe(input)
    expect(result.decisions).toEqual([{
      id: 'warning', source: 'legacy-fallback', reason: 'WARNING', shadowResult: 'WARNING',
    }])
  })

  it('falls back by identity for UNSUPPORTED rows', () => {
    const input = row('unsupported', { someday: [] })
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical')
    expect(result.page.items[0]).toBe(input)
    expect(result.decisions).toEqual([{
      id: 'unsupported', source: 'legacy-fallback', reason: 'UNSUPPORTED', shadowResult: 'UNSUPPORTED',
    }])
  })

  it('falls back by identity for a CRITICAL_MISMATCH', () => {
    const input = row('critical')
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical', {
      adapter: adapterWith(program => { program.owner = { kind: 'coach', coachId: 'another-coach' } }),
    })
    expect(result.page.items[0]).toBe(input)
    expect(result.decisions).toEqual([{
      id: 'critical', source: 'legacy-fallback', reason: 'CRITICAL_MISMATCH', shadowResult: 'CRITICAL_MISMATCH',
    }])
  })

  it('falls back when canonical normalization would change an operational UI value', () => {
    const input = row('representation', {
      days: [{ name: 'Push', exercises: [{ exercise_id: 'pushup', name: 'Pompes', sets: 2, reps: '8', rest: 60 }] }],
    })
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical')
    expect(result.page.items[0]).toBe(input)
    expect(result.decisions).toEqual([{
      id: 'representation', source: 'legacy-fallback', reason: 'PRESENTATION_MISMATCH', shadowResult: 'MATCH',
    }])
  })

  it('contains adapter failures and keeps the legacy item authoritative', () => {
    const input = row('adapter-error')
    const result = prepareCoachTemplatePageForServing(page([input]), 'coach-1', 'canonical-when-identical', {
      adapter: () => { throw new Error('adapter unavailable') },
    })
    expect(result.page.items[0]).toBe(input)
    expect(result.decisions).toEqual([{
      id: 'adapter-error', source: 'legacy-fallback', reason: 'ADAPTATION_ERROR',
    }])
  })

  it('emits exactly the three authorized decision fields for canonical and every fallback', () => {
    const decisions = [
      { id: 'private-canonical', source: 'canonical', shadowResult: 'MATCH' },
      { id: 'private-default', source: 'legacy-fallback', reason: 'ROLLBACK_LEGACY_ONLY' },
      { id: 'private-warning', source: 'legacy-fallback', reason: 'WARNING', shadowResult: 'WARNING' },
      { id: 'private-critical', source: 'legacy-fallback', reason: 'CRITICAL_MISMATCH', shadowResult: 'CRITICAL_MISMATCH' },
      { id: 'private-unsupported', source: 'legacy-fallback', reason: 'UNSUPPORTED', shadowResult: 'UNSUPPORTED' },
      { id: 'private-presentation', source: 'legacy-fallback', reason: 'PRESENTATION_MISMATCH', shadowResult: 'MATCH' },
      { id: 'private-error', source: 'legacy-fallback', reason: 'ADAPTATION_ERROR' },
    ] as const
    const telemetry: unknown[] = []
    observeCoachTemplateServingDecisions('canonical-when-identical', decisions, event => telemetry.push(event))

    expect(telemetry).toEqual([
      { serving_mode: 'canonical-when-identical', served_source: 'canonical', fallback_reason: null },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'ROLLBACK_LEGACY_ONLY' },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'WARNING' },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'CRITICAL_MISMATCH' },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'UNSUPPORTED' },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'PRESENTATION_MISMATCH' },
      { serving_mode: 'canonical-when-identical', served_source: 'legacy-fallback', fallback_reason: 'ADAPTATION_ERROR' },
    ])
    for (const event of telemetry) {
      expect(Object.keys(event as object).sort()).toEqual(['fallback_reason', 'served_source', 'serving_mode'])
    }
    expect(JSON.stringify(telemetry)).not.toMatch(/private-|coach|user|program|payload|Description|Développé/i)
  })

  it('keeps telemetry conversion redacted and contains observer failures', () => {
    expect(toCoachTemplateServingDecisionTelemetry('legacy-only', {
      id: 'secret-template-id', source: 'legacy-fallback', reason: 'ROLLBACK_LEGACY_ONLY',
    })).toEqual({
      serving_mode: 'legacy-only', served_source: 'legacy-fallback', fallback_reason: 'ROLLBACK_LEGACY_ONLY',
    })
    expect(() => observeCoachTemplateServingDecisions('legacy-only', [{
      id: 'secret-template-id', source: 'legacy-fallback', reason: 'ROLLBACK_LEGACY_ONLY',
    }], () => { throw new Error('telemetry unavailable') })).not.toThrow()
  })

  it('has no database or network boundary and is wired only from the program repository', () => {
    const contract = readFileSync('lib/training/coexistence/coach-template-serving-contract.ts', 'utf8')
    const repository = readFileSync('lib/repositories/training/program.ts', 'utf8')
    const hook = readFileSync('app/coach/hooks/useCoachProgramPagination.ts', 'utf8')
    expect(contract).not.toMatch(/\.from\(|\bfetch\(|createClient|XMLHttpRequest|WebSocket/)
    expect(repository).toContain("from '@/lib/training/coexistence/coach-template-serving-contract'")
    expect(repository).toContain('prepareCoachTemplatePageForServing(')
    expect(repository).toContain('observeCoachTemplateServingDecisions(servingMode, serving.decisions)')
    expect(hook).not.toContain('coach-template-serving-contract')
  })
})
