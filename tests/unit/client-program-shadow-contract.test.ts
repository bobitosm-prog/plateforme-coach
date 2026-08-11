import { describe, expect, it } from 'vitest'
import { adaptClientAssignment } from '@/lib/training/adapters'
import {
  buildClientProgramAdaptationEnvelope,
  CLIENT_PROGRAM_SHADOW_CRITICAL_PROPERTIES,
  CLIENT_PROGRAM_SHADOW_EXCLUDED_PROPERTIES,
  CLIENT_PROGRAM_SHADOW_MAX_ROWS_PER_READ,
  CLIENT_PROGRAM_SHADOW_WARNING_PROPERTIES,
  selectClientProgramShadowCandidate,
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
})
