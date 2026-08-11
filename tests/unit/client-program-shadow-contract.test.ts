import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adaptClientAssignment } from '@/lib/training/adapters'
import type { AdapterContext, AdapterResult, AssignedProgram } from '@/lib/training/model'
import {
  buildClientProgramAdaptationEnvelope,
  CLIENT_PROGRAM_SHADOW_CRITICAL_PROPERTIES,
  CLIENT_PROGRAM_SHADOW_EXCLUDED_PROPERTIES,
  CLIENT_PROGRAM_SHADOW_MAX_ROWS_PER_READ,
  CLIENT_PROGRAM_SHADOW_WARNING_PROPERTIES,
  compareClientProgramShadow,
  observeClientProgramShadow,
  selectClientProgramShadowCandidate,
  toClientProgramShadowMetric,
} from '@/lib/training/coexistence/client-program-shadow-contract'
import {
  clientDetailSaveWriterPayload,
  clientDetailSaveWriterRow,
  templateAssignmentWriterPayload,
  templateAssignmentWriterRow,
} from '../fixtures/client-program-writers'

const observedAt = '2026-08-11T12:00:00.000Z'

function adaptFixture(row: typeof templateAssignmentWriterRow) {
  const envelope = buildClientProgramAdaptationEnvelope(row, observedAt)
  expect(envelope.status).toBe('ready')
  if (envelope.status !== 'ready') throw new Error('Expected a ready envelope')
  return { envelope, result: adaptClientAssignment(envelope.input, envelope.context) }
}

type AssignmentMutator = (assignment: AssignedProgram) => void

const adapterWith = (mutate: AssignmentMutator) => (
  input: unknown,
  context: AdapterContext,
): AdapterResult<AssignedProgram> => {
  const result = adaptClientAssignment(input, context)
  if (result.status !== 'converted') return result
  const value = structuredClone(result.value)
  mutate(value)
  return { ...result, value }
}

const catalogRow = {
  ...templateAssignmentWriterRow,
  program: [{
    name: 'Push',
    exercises: [{ exercise_id: 'bench', name: 'Développé couché', sets: 3, reps: '8-12', rest: 90 }],
  }],
}

describe('client_programs shadow preparation contract', () => {
  it('selects only the newest repository-ordered row for the client dashboard', () => {
    const older = { ...templateAssignmentWriterRow, id: 'older', created_at: '2026-08-10T09:00:00.000Z' }
    expect(selectClientProgramShadowCandidate(
      [clientDetailSaveWriterRow, older],
      { consumer: 'dashboard-client' },
    )?.id).toBe('assignment-from-client-detail')
    expect(CLIENT_PROGRAM_SHADOW_MAX_ROWS_PER_READ).toBe(1)
  })

  it('selects only the assignment owned by the current coach for client detail', () => {
    const anotherCoach = { ...clientDetailSaveWriterRow, id: 'another-coach-row', coach_id: 'coach-2' }
    expect(selectClientProgramShadowCandidate(
      [anotherCoach, templateAssignmentWriterRow],
      { consumer: 'coach-client-detail', coachUserId: 'coach-writer-fixture' },
    )?.id).toBe('assignment-from-template')
  })

  it('adapts the exact template-assignment array without leaking database fields as unmapped', () => {
    const snapshot = structuredClone(templateAssignmentWriterRow)
    const { envelope, result } = adaptFixture(templateAssignmentWriterRow)
    expect(envelope.input).toEqual({
      program: templateAssignmentWriterRow.program,
      created_at: templateAssignmentWriterRow.created_at,
    })
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: 'client-writer-fixture' },
      clientId: 'client-writer-fixture',
      coachId: 'coach-writer-fixture',
      sourceProgramId: 'template-writer-fixture',
    })
    expect(templateAssignmentWriterPayload).toMatchObject({
      program_name: 'PPL writer fixture', training_program_id: 'template-writer-fixture',
    })
    expect(result).toMatchObject({ status: 'converted', legacyFormat: 'client-program-days-v1', unmappedFields: [] })
    expect(templateAssignmentWriterRow).toEqual(snapshot)
  })

  it('adapts the exact French-weekday detail writer and keeps a missing source as warning only', () => {
    const snapshot = structuredClone(clientDetailSaveWriterRow)
    const { result } = adaptFixture(clientDetailSaveWriterRow)
    expect(result).toMatchObject({ status: 'converted', legacyFormat: 'client-program-weekdays-fr-v1', unmappedFields: [] })
    expect(result.status === 'converted' && result.warnings).toContainEqual(expect.objectContaining({
      code: 'unresolved_reference', path: 'training_program_id',
    }))
    expect(clientDetailSaveWriterPayload).toMatchObject({ week_start: '2026-08-10' })
    expect(clientDetailSaveWriterRow).toEqual(snapshot)
  })

  it('keeps only verifiable semantics critical and excludes invented assignment state', () => {
    expect(CLIENT_PROGRAM_SHADOW_CRITICAL_PROPERTIES).toEqual([
      'client_owner', 'coach_assigner', 'day_order', 'rest_days', 'exercise_order',
      'exercise_references', 'sets', 'repetitions', 'rest_seconds',
    ])
    expect(CLIENT_PROGRAM_SHADOW_WARNING_PROPERTIES).toEqual([
      'missing_source_program', 'legacy_name_reference', 'non_critical_unmapped_fields',
    ])
    expect(CLIENT_PROGRAM_SHADOW_EXCLUDED_PROPERTIES).toEqual([
      'assignment_status', 'source_revision', 'timezone',
    ])
  })

  it('fails closed when ownership is absent without mutating the row', () => {
    const row = { ...templateAssignmentWriterRow, client_id: null }
    const snapshot = structuredClone(row)
    expect(buildClientProgramAdaptationEnvelope(row, observedAt)).toEqual({
      status: 'unsupported', reason: 'MISSING_CLIENT_OWNER',
    })
    expect(row).toEqual(snapshot)
  })

  it('classifies faithful writer shapes and keeps source absence as WARNING', () => {
    expect(compareClientProgramShadow(catalogRow)).toEqual({
      format: 'client-program-days-v1', result: 'MATCH', differences: [], warningCount: 0, unmappedFieldCount: 0,
    })

    const arrayResult = compareClientProgramShadow(templateAssignmentWriterRow)
    expect(arrayResult).toMatchObject({ format: 'client-program-days-v1', result: 'WARNING' })
    expect(arrayResult.differences.map(difference => difference.code)).toContain('LEGACY_NAME_REFERENCE')

    const weekdaysResult = compareClientProgramShadow(clientDetailSaveWriterRow)
    expect(weekdaysResult).toMatchObject({ format: 'client-program-weekdays-fr-v1', result: 'WARNING' })
    expect(weekdaysResult.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'SOURCE_PROGRAM_MISSING', 'LEGACY_NAME_REFERENCE',
    ]))
  })

  it('reports only allowed semantic mismatches as critical', () => {
    const result = compareClientProgramShadow(catalogRow, {
      adapter: adapterWith(assignment => {
        assignment.clientId = 'other-client'
        assignment.assignedBy = { kind: 'coach', coachId: 'other-coach' }
        const day = assignment.programSnapshot.weeks[0].days[0]
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
      'OWNER_MISMATCH', 'COACH_ASSIGNER_MISMATCH', 'EXERCISE_REFERENCE_MISMATCH',
      'SETS_MISMATCH', 'REPS_MISMATCH', 'REST_SECONDS_MISMATCH',
    ]))
  })

  it('detects day, rest-day, and exercise ordering changes', () => {
    const dayOrder = compareClientProgramShadow(clientDetailSaveWriterRow, {
      adapter: adapterWith(assignment => {
        assignment.programSnapshot.weeks[0].days.reverse()
      }),
    })
    expect(dayOrder.result).toBe('CRITICAL_MISMATCH')
    expect(dayOrder.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'DAY_ORDER_MISMATCH', 'REST_DAY_MISMATCH',
    ]))

    const exerciseOrder = compareClientProgramShadow(templateAssignmentWriterRow, {
      adapter: adapterWith(assignment => {
        const day = assignment.programSnapshot.weeks[0].days[0]
        if (day.kind === 'training') day.sessions[0].blocks[0].exercises.reverse()
      }),
    })
    expect(exerciseOrder.differences.map(difference => difference.code)).toContain('EXERCISE_ORDER_MISMATCH')
  })

  it('does not compare assignment status, source revision, or timezone', () => {
    const result = compareClientProgramShadow(catalogRow, {
      adapter: adapterWith(assignment => {
        assignment.status = 'completed'
        assignment.sourceRevision = 999
        assignment.timezone = 'Pacific/Auckland'
      }),
    })
    expect(result).toMatchObject({ result: 'MATCH', differences: [] })
  })

  it('contains adapter and observer failures without mutating legacy rows', () => {
    const rows = [templateAssignmentWriterRow, clientDetailSaveWriterRow]
    const snapshot = structuredClone(rows)
    expect(compareClientProgramShadow(templateAssignmentWriterRow, {
      adapter: () => { throw new Error('adapter unavailable') },
    })).toMatchObject({ result: 'UNSUPPORTED' })
    expect(() => observeClientProgramShadow(rows, { consumer: 'dashboard-client' }, () => {
      throw new Error('observer unavailable')
    })).not.toThrow()
    expect(rows).toEqual(snapshot)
  })

  it('observes exactly one consumed row and emits only redacted metrics', () => {
    const metrics: unknown[] = []
    observeClientProgramShadow(
      [templateAssignmentWriterRow, clientDetailSaveWriterRow],
      { consumer: 'dashboard-client' },
      metric => metrics.push(metric),
      {
        clock: () => 10,
        correlationId: () => 'opaque-correlation',
      },
    )
    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toEqual({
      format: 'client-program-days-v1', result: 'WARNING', difference_codes: ['LEGACY_NAME_REFERENCE'],
      warning_count: 3, unmapped_field_count: 0, adaptation_duration_ms: 0,
      correlation_id: 'opaque-correlation',
    })
    expect(JSON.stringify(metrics)).not.toMatch(/client-writer|coach-writer|template-writer|Développé|PPL writer/i)
  })

  it('bounds timings and deduplicates metric difference codes', () => {
    expect(toClientProgramShadowMetric({
      format: 'client-program-days-v1', result: 'CRITICAL_MISMATCH',
      differences: [
        { code: 'SETS_MISMATCH', path: 'days[0].exercises[0]' },
        { code: 'SETS_MISMATCH', path: 'days[0].exercises[1]' },
      ],
      warningCount: 0, unmappedFieldCount: 0,
    }, -1, 'opaque')).toMatchObject({
      difference_codes: ['SETS_MISMATCH'], adaptation_duration_ms: 0,
    })
  })

  it('contains no database, network, or remote telemetry boundary', () => {
    const source = readFileSync('lib/training/coexistence/client-program-shadow-contract.ts', 'utf8')
    expect(source).not.toMatch(/\.from\(|\bfetch\(|createClient|XMLHttpRequest|WebSocket/)
    expect(source).not.toMatch(/service_role|Authorization|cookie|JWT|client_id:\s*metric|coach_id:\s*metric/)
  })
})
