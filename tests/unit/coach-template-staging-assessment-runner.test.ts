import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { createTrainingProgramRepository } from '../../lib/repositories/training/program'
import { adaptCoachTemplate } from '../../lib/training/adapters'
import {
  runCoachTemplateStagingAssessment,
  type CoachTemplateStagingAssessmentAuthority,
} from '../../lib/training/coexistence/coach-template-staging-assessment-runner'

type QueryResult = { data: unknown; error: unknown }

const stagingAuthority: CoachTemplateStagingAssessmentAuthority = {
  applicationEnvironment: 'staging',
  deploymentEnvironment: 'preview',
  branch: 'phase-6-staging',
  requestedMode: 'assessment-only',
}

const coachTemplateRow = (id: string, program: unknown = {
  days: [{
    name: 'Push',
    exercises: [{ exercise_id: 'bench', name: 'Développé couché', sets: 3, reps: '8-12', rest: 90 }],
  }],
}) => ({
  id,
  coach_id: 'coach-sensitive',
  name: `Private template ${id}`,
  description: 'Private description',
  is_template: true,
  tags: [],
  program,
  created_at: '2026-08-13T10:00:00.000Z',
})

function sequentialClient(results: QueryResult[]) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const from = vi.fn(() => {
    const result = results.shift() ?? { data: null, error: { code: 'PGRST000' } }
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'or', 'is', 'gt']) {
      chain[method] = vi.fn((...args: unknown[]) => {
        calls.push({ method, args })
        return chain
      })
    }
    chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => (
      Promise.resolve(result).then(resolve, reject)
    )
    return chain
  })
  return { client: { from } as unknown as DatabaseClient, from, calls }
}

describe('coach-template staging assessment runner', () => {
  it('exhausts existing pagination under one opaque run and returns only an aggregated terminal report', async () => {
    const firstRows = [
      coachTemplateRow('00000000-0000-0000-0000-000000000001'),
      coachTemplateRow('00000000-0000-0000-0000-000000000002'),
      coachTemplateRow('00000000-0000-0000-0000-000000000003'),
    ]
    const finalRow = coachTemplateRow('00000000-0000-0000-0000-000000000004')
    const mock = sequentialClient([
      { data: firstRows, error: null },
      { data: [finalRow], error: null },
    ])
    const pageEvents: Array<Record<string, unknown>> = []
    const constructedModes: string[] = []
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await runCoachTemplateStagingAssessment({
      authority: stagingAuthority,
      coachUserId: 'coach-sensitive',
      pageSize: 2,
      createReader: control => {
        constructedModes.push(control.mode)
        return createTrainingProgramRepository(mock.client, { coachTemplateServingControl: control })
      },
      pageTelemetryObserver: event => pageEvents.push(event),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('assessment report expected')
    expect(result.report).toEqual({
      assessment_run_id: expect.any(String),
      page_count: 2,
      total_line_count: 3,
      canonical_eligible: 3,
      warning: 0,
      critical_mismatch: 0,
      unsupported: 0,
      presentation_mismatch: 0,
      adaptation_error: 0,
      observer_error: 0,
      warning_rate: 0,
      terminal_page_reached: true,
    })
    expect(pageEvents).toHaveLength(2)
    expect(pageEvents.map(event => event.assessment_run_id)).toEqual([
      result.report.assessment_run_id,
      result.report.assessment_run_id,
    ])
    expect(pageEvents.map(event => event.page_sequence)).toEqual([1, 2])
    expect(pageEvents.map(event => event.terminal_page)).toEqual([false, true])
    expect(constructedModes).toEqual(['assessment-only'])
    expect(consoleInfo.mock.calls.filter(call => call[0] === '[training.coach-template.serving]')).toEqual([])
    expect(mock.from).toHaveBeenCalledTimes(2)
    expect(mock.calls.filter(call => call.method === 'select')).toHaveLength(2)
    expect(mock.calls.filter(call => call.method === 'limit').map(call => call.args)).toEqual([[3], [3]])
    expect(mock.calls.filter(call => call.method === 'or')).toHaveLength(1)
    expect(JSON.stringify(result.report)).not.toMatch(
      /coach-sensitive|Private|template|description|00000000|cursor|created_at|program|payload/i,
    )
    consoleInfo.mockRestore()
  })

  it('aggregates every assessment category and the warning rate without serving canonical rows', async () => {
    const rows = [
      coachTemplateRow('canonical'),
      coachTemplateRow('warning', {
        split: 'PPL',
        days: [{ name: 'Push', exercises: [{ name: 'Pompes', sets: 2, reps: 'AMRAP', rest: 60 }] }],
      }),
      coachTemplateRow('critical'),
      coachTemplateRow('unsupported', { someday: [] }),
      coachTemplateRow('presentation', {
        days: [{ name: 'Push', exercises: [{ exercise_id: 'bench', name: 'Bench', sets: 3, reps: '8', rest: 90 }] }],
      }),
      coachTemplateRow('adaptation-error'),
    ]
    const mock = sequentialClient([{ data: rows, error: null }])
    const returnedLegacyRows: unknown[] = []
    const result = await runCoachTemplateStagingAssessment({
      authority: stagingAuthority,
      coachUserId: 'coach-sensitive',
      createReader: control => {
        const repository = createTrainingProgramRepository(mock.client, { coachTemplateServingControl: control })
        return {
          listCoachProgramPage: async (...args) => {
            const page = await repository.listCoachProgramPage(...args)
            if (page.ok) returnedLegacyRows.push(...page.data.items)
            return page
          },
        }
      },
      dependencies: {
        adapter: (input, context) => {
          const id = typeof input === 'object' && input !== null && 'id' in input ? input.id : undefined
          if (id === 'adaptation-error') throw new Error('synthetic adapter failure')
          const adapted = adaptCoachTemplate(input, context)
          if (id !== 'critical' || adapted.status !== 'converted') return adapted
          return { ...adapted, value: { ...adapted.value, owner: { kind: 'coach', coachId: 'other-coach' } } }
        },
      },
    })

    expect(result).toEqual({
      ok: true,
      report: {
        assessment_run_id: expect.any(String),
        page_count: 1,
        total_line_count: 6,
        canonical_eligible: 1,
        warning: 1,
        critical_mismatch: 1,
        unsupported: 1,
        presentation_mismatch: 1,
        adaptation_error: 1,
        observer_error: 0,
        warning_rate: 1 / 6,
        terminal_page_reached: true,
      },
    })
    expect(returnedLegacyRows).toHaveLength(rows.length)
    returnedLegacyRows.forEach((row, index) => expect(row).toBe(rows[index]))
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.calls.filter(call => call.method === 'select')).toHaveLength(1)
  })

  it('counts observer failure through the assessment fallback and still completes read-only', async () => {
    const mock = sequentialClient([{ data: [coachTemplateRow('observer')], error: null }])
    const result = await runCoachTemplateStagingAssessment({
      authority: stagingAuthority,
      coachUserId: 'coach-sensitive',
      createReader: control => createTrainingProgramRepository(mock.client, {
        coachTemplateServingControl: control,
      }),
      pageTelemetryObserver: () => { throw new Error('synthetic observer failure') },
    })

    expect(result.ok && result.report.observer_error).toBe(1)
    expect(result.ok && result.report.terminal_page_reached).toBe(true)
    expect(mock.from).toHaveBeenCalledTimes(1)
  })

  it('rejects non-staging or Production authority before constructing a reader', async () => {
    const createReader = vi.fn()
    const production = await runCoachTemplateStagingAssessment({
      authority: { ...stagingAuthority, deploymentEnvironment: 'production' },
      coachUserId: 'coach-sensitive',
      createReader,
    })
    const wrongBranch = await runCoachTemplateStagingAssessment({
      authority: { ...stagingAuthority, branch: 'main' },
      coachUserId: 'coach-sensitive',
      createReader,
    })
    const canonicalRequest = await runCoachTemplateStagingAssessment({
      authority: { ...stagingAuthority, requestedMode: 'canonical-when-identical' },
      coachUserId: 'coach-sensitive',
      createReader,
    })

    expect(production).toEqual({ ok: false, reason: 'STAGING_AUTHORITY_REJECTED' })
    expect(wrongBranch).toEqual({ ok: false, reason: 'STAGING_AUTHORITY_REJECTED' })
    expect(canonicalRequest).toEqual({ ok: false, reason: 'STAGING_AUTHORITY_REJECTED' })
    expect(createReader).not.toHaveBeenCalled()
  })

  it('stops safely on a page read error without attempting another page or exposing the error', async () => {
    const firstRows = [
      coachTemplateRow('00000000-0000-0000-0000-000000000001'),
      coachTemplateRow('00000000-0000-0000-0000-000000000002'),
    ]
    const mock = sequentialClient([
      { data: firstRows, error: null },
      { data: null, error: { code: 'PGRST000', message: 'private database failure' } },
    ])
    const result = await runCoachTemplateStagingAssessment({
      authority: stagingAuthority,
      coachUserId: 'coach-sensitive',
      pageSize: 1,
      createReader: control => createTrainingProgramRepository(mock.client, {
        coachTemplateServingControl: control,
      }),
    })

    expect(result).toEqual({ ok: false, reason: 'PAGE_READ_FAILED' })
    expect(mock.from).toHaveBeenCalledTimes(2)
    expect(mock.calls.filter(call => call.method === 'select')).toHaveLength(2)
    expect(JSON.stringify(result)).not.toMatch(/private|database|PGRST|coach-sensitive/i)
  })
})
