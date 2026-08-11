import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { CoachProgramRow } from '../../lib/repositories/training'
import { adaptCoachTemplate } from '../../lib/training/adapters'
import type { AdapterContext, AdapterResult, TrainingProgram } from '../../lib/training/model'
import {
  compareCoachTemplateShadow,
  observeCoachTemplateShadowPage,
  toCoachTemplateShadowMetric,
} from '../../lib/training/coexistence/coach-template-shadow-read'

const row = (program: unknown = {
  days: [
    {
      name: 'Push',
      exercises: [
        { exercise_id: 'bench', name: 'Développé couché', sets: 2, reps: '8-12', rest: 90 },
        { exercise_id: 'press', name: 'Développé militaire', sets: 3, reps: 8, rest: '60s' },
      ],
    },
    { name: 'Repos', is_rest: true, exercises: [] },
  ],
}): CoachProgramRow => ({
  id: 'template-1', coach_id: 'coach-1', name: 'PPL fidèle', description: 'Description non sensible',
  is_template: true, tags: ['PPL', 'Force'], program: program as CoachProgramRow['program'],
  created_at: '2026-08-11T10:00:00.000Z',
})

type ProgramMutator = (program: TrainingProgram) => void

const adapterWith = (mutate: ProgramMutator) => (input: unknown, context: AdapterContext): AdapterResult<TrainingProgram> => {
  const result = adaptCoachTemplate(input, context)
  if (result.status !== 'converted') return result
  const value = structuredClone(result.value)
  mutate(value)
  return { ...result, value }
}

describe('coach template legacy-to-canonical shadow read', () => {
  it('classifies a faithful simple template as MATCH without mutating it', () => {
    const input = row()
    const snapshot = structuredClone(input)
    expect(compareCoachTemplateShadow(input, 'coach-1')).toEqual({
      format: 'coach-template-envelope-v1', result: 'MATCH', differences: [], warningCount: 0, unmappedFieldCount: 0,
    })
    expect(input).toEqual(snapshot)
  })

  it('classifies adapter warnings and unmapped fields without treating them as critical', () => {
    const input = row({
      split: 'PPL',
      days: [{ name: 'Push', exercises: [{ name: 'Pompes', sets: 2, reps: 'AMRAP' }] }],
    })
    const result = compareCoachTemplateShadow(input, 'coach-1')
    expect(result.result).toBe('WARNING')
    expect(result.warningCount).toBeGreaterThanOrEqual(2)
    expect(result.unmappedFieldCount).toBe(1)
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'ADAPTER_WARNINGS', 'UNMAPPED_FIELDS',
    ]))
  })

  it('reports day/rest and exercise ordering as critical semantic mismatches', () => {
    const result = compareCoachTemplateShadow(row(), 'coach-1', {
      adapter: adapterWith(program => {
        program.weeks[0].days.reverse()
        const trainingDay = program.weeks[0].days.find(day => day.kind === 'training')
        if (trainingDay?.kind === 'training') trainingDay.sessions[0].blocks[0].exercises.reverse()
      }),
    })
    expect(result.result).toBe('CRITICAL_MISMATCH')
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'DAY_ORDER_MISMATCH', 'REST_DAY_MISMATCH',
    ]))

    const exerciseOrder = compareCoachTemplateShadow(row(), 'coach-1', {
      adapter: adapterWith(program => {
        const day = program.weeks[0].days[0]
        if (day.kind === 'training') day.sessions[0].blocks[0].exercises.reverse()
      }),
    })
    expect(exerciseOrder.differences.map(difference => difference.code)).toContain('EXERCISE_ORDER_MISMATCH')
  })

  it('reports ownership, references, sets, repetitions and rest mismatches', () => {
    const result = compareCoachTemplateShadow(row(), 'coach-1', {
      adapter: adapterWith(program => {
        program.owner = { kind: 'coach', coachId: 'another-coach' }
        const day = program.weeks[0].days[0]
        if (day.kind !== 'training') throw new Error('Expected training day')
        const exercise = day.sessions[0].blocks[0].exercises[0]
        exercise.exercise = { kind: 'catalog', exerciseId: 'other', snapshotName: 'Other' }
        exercise.prescriptions.pop()
        exercise.prescriptions[0].target = { kind: 'repetitions', min: 12, max: 12 }
        exercise.defaultRest = { kind: 'fixed', seconds: 30 }
      }),
    })
    expect(result.result).toBe('CRITICAL_MISMATCH')
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH', 'REST_SECONDS_MISMATCH',
    ]))
  })

  it('compares the template name, status and ordered tags', () => {
    const result = compareCoachTemplateShadow(row(), 'coach-1', {
      adapter: adapterWith(program => {
        program.name = 'Nom canonique divergent'
        program.status = 'active'
        program.tags = [...program.tags].reverse()
      }),
    })
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'NAME_MISMATCH', 'STATUS_MISMATCH', 'TAGS_MISMATCH',
    ]))
  })

  it('isolates unknown input and thrown adapters as UNSUPPORTED', () => {
    expect(compareCoachTemplateShadow(row({ someday: [] }), 'coach-1')).toMatchObject({
      result: 'UNSUPPORTED', differences: [{ code: 'ADAPTER_UNSUPPORTED' }],
    })
    expect(compareCoachTemplateShadow(row(), 'coach-1', {
      adapter: () => { throw new Error('shadow failure') },
    })).toMatchObject({ result: 'UNSUPPORTED' })
  })

  it('emits only redacted metrics and keeps legacy rows untouched when the observer throws', () => {
    const input = row({
      days: [{
        name: 'secret-client@example.test',
        exercises: [{ exercise_id: 'secret-token', name: 'Bearer secret-jwt', sets: 1, reps: 8, rest: 60 }],
      }],
    })
    const snapshot = structuredClone(input)
    const metrics: unknown[] = []
    observeCoachTemplateShadowPage([input], 'coach-1', metric => metrics.push(metric), {
      clock: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(11.234),
      correlationId: () => 'shadow-correlation-1',
    })
    expect(metrics).toEqual([{
      format: 'coach-template-envelope-v1', result: 'MATCH', difference_codes: [], warning_count: 0,
      unmapped_field_count: 0, adaptation_duration_ms: 1.23, correlation_id: 'shadow-correlation-1',
    }])
    expect(JSON.stringify(metrics)).not.toMatch(/secret-client|secret-token|secret-jwt|Bearer/i)
    expect(() => observeCoachTemplateShadowPage([input], 'coach-1', () => {
      throw new Error('observer unavailable')
    })).not.toThrow()
    expect(() => observeCoachTemplateShadowPage([input], 'coach-1', () => undefined, {
      clock: () => { throw new Error('clock unavailable') },
    })).not.toThrow()
    expect(input).toEqual(snapshot)
  })

  it('bounds negative timings and deduplicates metric difference codes', () => {
    const metric = toCoachTemplateShadowMetric({
      format: 'coach-template-envelope-v1', result: 'CRITICAL_MISMATCH',
      differences: [
        { code: 'SETS_MISMATCH', path: 'days[0].exercises[0]' },
        { code: 'SETS_MISMATCH', path: 'days[0].exercises[1]' },
      ],
      warningCount: 0, unmappedFieldCount: 0,
    }, -10, 'shadow-correlation-2')
    expect(metric.adaptation_duration_ms).toBe(0)
    expect(metric.difference_codes).toEqual(['SETS_MISMATCH'])
  })

  it('contains no database or network boundary', () => {
    const source = readFileSync('lib/training/coexistence/coach-template-shadow-read.ts', 'utf8')
    expect(source).not.toMatch(/\.from\(|\bfetch\(|createClient|XMLHttpRequest|WebSocket/)
  })
})
