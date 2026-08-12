import { describe, expect, it, vi } from 'vitest'
import type { PersonalProgramRow } from '../../lib/repositories/training/program'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  isManualCustomProgramShadowCandidate,
  observeActiveManualCustomProgramShadow,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'

const manualProgram = (overrides: Partial<PersonalProgramRow> = {}): PersonalProgramRow => ({
  id: 'personal-sensitive-id',
  user_id: 'client-sensitive-id',
  name: 'Programme sensible',
  description: 'Description privée',
  days: [
    {
      name: 'Push',
      is_rest: false,
      exercises: [{ exercise_id: 'catalog-bench', name: 'Développé privé', sets: 3, reps: '8-10', rest_seconds: 90 }],
    },
    { name: 'Repos', is_rest: true, exercises: [] },
  ],
  phases: null,
  source: 'manual',
  is_active: true,
  scheduled: false,
  start_date: null,
  current_week: 1,
  total_weeks: null,
  created_at: '2026-08-12T10:00:00.000Z',
  updated_at: '2026-08-12T10:00:00.000Z',
  ...overrides,
})

describe('custom_programs manual shadow read', () => {
  it('selects only the explicit manual/editor-normalized provenance bucket', () => {
    expect(isManualCustomProgramShadowCandidate(manualProgram())).toBe(true)
    for (const source of ['ai', 'onboarding_auto', 'cron_auto', 'diagnostic_auto', 'free_session', 'import', 'unknown', null]) {
      expect(isManualCustomProgramShadowCandidate(manualProgram({ source }))).toBe(false)
    }
  })

  it('builds a narrow adapter envelope without database technical metadata', () => {
    const row = manualProgram({
      phases: [{ name: 'Phase privée' }],
      scheduled: true,
      start_date: '2026-08-18',
      current_week: 2,
      total_weeks: 12,
    }) as PersonalProgramRow & { source: 'manual' }
    const envelope = buildCustomProgramAdaptationEnvelope(row, '2026-08-12T12:00:00.000Z')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.input).toEqual({
      name: 'Programme sensible',
      description: 'Description privée',
      days: row.days,
      source: 'manual',
      phases: row.phases,
    })
    expect(envelope.context.owner).toEqual({ kind: 'client', clientId: 'client-sensitive-id' })
    expect(envelope.input).not.toHaveProperty('id')
    expect(envelope.input).not.toHaveProperty('user_id')
    expect(envelope.input).not.toHaveProperty('is_active')
    expect(envelope.input).not.toHaveProperty('scheduled')
    expect(envelope.input).not.toHaveProperty('created_at')
    expect(envelope.input).not.toHaveProperty('updated_at')
  })

  it('matches a faithful catalog-referenced manual program', () => {
    expect(compareCustomProgramShadow(manualProgram() as PersonalProgramRow & { source: 'manual' }))
      .toEqual({
        format: 'custom-program-days-v1',
        result: 'MATCH',
        differences: [],
        warningCount: 0,
        unmappedFieldCount: 0,
      })
  })

  it('keeps editor-normalized name references and provenance signals as warnings', () => {
    const row = manualProgram({
      days: [{
        day_number: 1,
        name: 'Full body',
        muscle_groups: ['full_body'],
        exercises: [{ id: 'catalog-row', name: 'Row privé', sets: 3, reps: 10, rest: 60 }],
      }],
    }) as PersonalProgramRow & { source: 'manual' }
    const result = compareCustomProgramShadow(row)
    expect(result.result).toBe('WARNING')
    expect(result.differences.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'LEGACY_NAME_REFERENCE',
      'PROVENANCE_UNCERTAIN',
    ]))
  })

  it('reports phases and superset technique as warnings without changing semantics', () => {
    const row = manualProgram({
      phases: [{ name: 'Phase 1' }],
      days: [{
        name: 'Push',
        exercises: [{ exercise_id: 'bench', name: 'Bench', sets: 3, reps: 8, rest: 90, technique: 'superset', phases: { p1: { reps: 8 } } }],
      }],
    }) as PersonalProgramRow & { source: 'manual' }
    const result = compareCustomProgramShadow(row)
    expect(result.result).toBe('WARNING')
    expect(result.differences.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'PHASES_UNMAPPED',
      'TECHNIQUE_SEMANTICS_UNMAPPED',
      'UNMAPPED_FIELDS',
    ]))
  })

  it('isolates unsupported shapes and adapter failures', () => {
    const ambiguous = manualProgram({
      days: [{ name: 'Ambigu', exercises: [{ name: 'Squat', exercise_id: 'catalog', custom_exercise_id: 'custom', sets: 3, reps: 8 }] }],
    }) as PersonalProgramRow & { source: 'manual' }
    expect(compareCustomProgramShadow(ambiguous)).toMatchObject({
      result: 'UNSUPPORTED',
      differences: [{ code: 'ADAPTER_UNSUPPORTED' }],
    })
    expect(compareCustomProgramShadow(manualProgram({ days: { lundi: {} } }) as PersonalProgramRow & { source: 'manual' }))
      .toMatchObject({ result: 'UNSUPPORTED' })
    expect(compareCustomProgramShadow(manualProgram() as PersonalProgramRow & { source: 'manual' }, {
      adapter: () => { throw new Error('shadow-only failure') },
    })).toMatchObject({ result: 'UNSUPPORTED' })
  })

  it('can detect a critical semantic mismatch from a converted canonical result', () => {
    const row = manualProgram() as PersonalProgramRow & { source: 'manual' }
    const result = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        return {
          ...adapted,
          value: { ...adapted.value, name: 'Autre nom' },
        }
      },
    })
    expect(result).toMatchObject({
      result: 'CRITICAL_MISMATCH',
      differences: expect.arrayContaining([{ code: 'NAME_MISMATCH', path: 'name' }]),
    })
  })

  it('emits one expurgated metric and contains observer failures', () => {
    const row = manualProgram() as PersonalProgramRow & { source: 'manual' }
    const observer = vi.fn()
    expect(() => observeActiveManualCustomProgramShadow(row, observer, {
      clock: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12.345),
      correlationId: () => 'opaque-correlation',
    })).not.toThrow()
    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith({
      format: 'custom-program-days-v1',
      provenance_bucket: 'manual/editor-normalized',
      result: 'MATCH',
      difference_codes: [],
      warning_count: 0,
      unmapped_field_count: 0,
      adaptation_duration_ms: 2.35,
      correlation_id: 'opaque-correlation',
    })
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/client-sensitive|personal-sensitive|Programme sensible|Description privée|Développé privé/)
    expect(() => observeActiveManualCustomProgramShadow(row, () => { throw new Error('observer failed') }, {
      clock: () => 1,
      correlationId: () => 'opaque',
    })).not.toThrow()
  })

  it('does not observe excluded sources and never mutates the legacy row', () => {
    const manual = structuredClone(manualProgram()) as PersonalProgramRow & { source: 'manual' }
    const before = structuredClone(manual)
    compareCustomProgramShadow(manual)
    expect(manual).toEqual(before)

    const observer = vi.fn()
    for (const source of ['ai', 'import', 'unknown', null]) {
      observeActiveManualCustomProgramShadow(manualProgram({ source }), observer)
    }
    expect(observer).not.toHaveBeenCalled()
  })

  it('keeps metric construction limited to the public telemetry contract', () => {
    const metric = toCustomProgramShadowMetric({
      format: 'custom-program-days-v1',
      result: 'WARNING',
      differences: [{ code: 'LEGACY_NAME_REFERENCE', path: 'private.path' }],
      warningCount: 1,
      unmappedFieldCount: 0,
    }, 1.234, 'opaque')
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(metric).not.toHaveProperty('differences')
  })
})
