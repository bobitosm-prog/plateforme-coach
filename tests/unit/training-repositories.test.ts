import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { buildPersistedAiCustomProgramFixture } from '../fixtures/custom-program-ai'
import { buildPersistedDiagnosticCustomProgramFixture } from '../fixtures/custom-program-diagnostic'
import { buildPersistedOnboardingCustomProgramFixture } from '../fixtures/custom-program-onboarding'
import {
  ASSIGNED_PROGRAM_PROJECTION,
  CATALOG_EXERCISE_PROJECTION,
  COACH_PROGRAM_PROJECTION,
  COMPLETED_WORKOUT_DATE_PROJECTION,
  COMPLETION_PROJECTION,
  CUSTOM_EXERCISE_PROJECTION,
  PERSONAL_PROGRAM_PROJECTION,
  PERSONAL_RECORD_PROJECTION,
  DASHBOARD_WORKOUT_SESSION_PROJECTION,
  WORKOUT_SESSION_PROJECTION,
  createTrainingExerciseRepository,
  createTrainingProgramRepository,
  createTrainingSessionRepository,
} from '../../lib/repositories/training'

type QueryResult = { data: unknown; error: unknown }

function clientWith(result: QueryResult) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'ilike', 'or', 'is', 'gt']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return chain
    })
  }
  chain.maybeSingle = vi.fn(async () => result)
  chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  const client = { from: vi.fn(() => chain) } as unknown as DatabaseClient
  return { client, chain, calls, from: client.from as ReturnType<typeof vi.fn> }
}

describe('Training repositories', () => {
  it('uses explicit program projections and owner/client scopes', async () => {
    const mock = clientWith({ data: [], error: null })
    const repository = createTrainingProgramRepository(mock.client)

    await repository.listCoachPrograms('coach-session-id')
    expect(mock.from).toHaveBeenLastCalledWith('training_programs')
    expect(mock.chain.select).toHaveBeenLastCalledWith(COACH_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('coach_id', 'coach-session-id')

    await repository.listAssignedProgramsForClient('client-session-id')
    expect(mock.from).toHaveBeenLastCalledWith('client_programs')
    expect(mock.chain.select).toHaveBeenLastCalledWith(ASSIGNED_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('client_id', 'client-session-id')
    expect(mock.chain.order).toHaveBeenLastCalledWith('created_at', { ascending: false })

    await repository.listPersonalProgramsForClient('client-session-id')
    expect(mock.from).toHaveBeenLastCalledWith('custom_programs')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-session-id')

    await repository.findActivePersonalProgramForClient('client-session-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns the identical legacy array while observing only the dashboard candidate', async () => {
    const rows = [{
      id: 'assignment-1', client_id: 'client-1', coach_id: 'coach-1', training_program_id: 'template-1',
      program: [{ name: 'Push', exercises: [{ exercise_id: 'bench', name: 'Bench', sets: 3, reps: 8, rest: 90 }] }],
      created_at: '2026-08-11T10:00:00.000Z', updated_at: '2026-08-11T10:00:00.000Z',
    }, {
      id: 'assignment-older', client_id: 'client-1', coach_id: 'coach-2', training_program_id: null,
      program: { lundi: { repos: true, exercises: [] } },
      created_at: '2026-08-10T10:00:00.000Z', updated_at: '2026-08-10T10:00:00.000Z',
    }]
    const mock = clientWith({ data: rows, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).listAssignedProgramsForClient('client-1', {
      shadowSelection: { consumer: 'dashboard-client' },
    })
    expect(result.ok && result.data).toBe(rows)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo.mock.calls[0][1]).toMatchObject({ format: 'client-program-days-v1', result: 'MATCH' })
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toMatch(/client-1|coach-1|template-1|Bench/)
    consoleInfo.mockRestore()
  })

  it('returns the identical active manual program while shadowing it after one read', async () => {
    const row = {
      id: 'personal-sensitive', user_id: 'client-sensitive', name: 'Private program', description: null,
      days: [{ name: 'Push', exercises: [{ exercise_id: 'bench', name: 'Private bench', sets: 3, reps: 8, rest: 90 }] }],
      phases: null, source: 'manual', is_active: true, scheduled: false, start_date: null,
      current_week: 1, total_weeks: null, created_at: '2026-08-12T10:00:00.000Z', updated_at: '2026-08-12T10:00:00.000Z',
    }
    const mock = clientWith({ data: row, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).findActivePersonalProgramForClient('client-sensitive')
    expect(result.ok && result.data).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
    expect(mock.chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo.mock.calls[0][1]).toMatchObject({
      format: 'custom-program-days-v1',
      provenance_bucket: 'manual/editor-normalized',
      result: 'MATCH',
    })
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toMatch(/client-sensitive|personal-sensitive|Private program|Private bench/)
    consoleInfo.mockRestore()
  })

  it('returns the identical active AI program while emitting its distinct bucket after one read', async () => {
    const { row } = buildPersistedAiCustomProgramFixture()
    const mock = clientWith({ data: row, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client)
      .findActivePersonalProgramForClient('synthetic-ai-client')
    expect(result.ok && result.data).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
    expect(mock.chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo.mock.calls[0][1]).toMatchObject({
      format: 'custom-program-days-v1',
      provenance_bucket: 'ai/program-builder',
      result: 'WARNING',
      difference_codes: expect.arrayContaining([
        'LEGACY_NAME_REFERENCE', 'AI_MUSCLE_PRIMARY_UNMAPPED', 'AI_METADATA_UNMAPPED',
        'AI_PROVIDER_METADATA_UNAVAILABLE', 'TECHNIQUE_SEMANTICS_UNMAPPED',
      ]),
    })
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toMatch(/synthetic-ai-client|synthetic-ai-program|Programme IA|Développé|Rowing|Goblet/)
    consoleInfo.mockRestore()
  })

  it('returns the identical onboarding program while emitting its prepared bucket after one read', async () => {
    const { row } = buildPersistedOnboardingCustomProgramFixture()
    const mock = clientWith({ data: row, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client)
      .findActivePersonalProgramForClient('synthetic-onboarding-client')
    expect(result.ok && result.data).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
    expect(mock.chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo.mock.calls[0][1]).toMatchObject({
      format: 'custom-program-days-v1',
      provenance_bucket: 'onboarding-auto',
      result: 'WARNING',
      difference_codes: expect.arrayContaining([
        'LEGACY_NAME_REFERENCE', 'AI_MUSCLE_PRIMARY_UNMAPPED', 'AI_METADATA_UNMAPPED',
        'AI_PROVIDER_METADATA_UNAVAILABLE', 'TECHNIQUE_SEMANTICS_UNMAPPED',
        'REST_DAYS_NOT_PERSISTED', 'DAY_NUMBER_NON_AUTHORITATIVE',
      ]),
    })
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toMatch(/synthetic-onboarding|Programme initial|Développé|Rowing|Goblet/)
    consoleInfo.mockRestore()
  })

  it('returns the identical diagnostic program while emitting its prepared bucket after one read', async () => {
    const { row } = buildPersistedDiagnosticCustomProgramFixture()
    const mock = clientWith({ data: row, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client)
      .findActivePersonalProgramForClient('synthetic-diagnostic-client')
    expect(result.ok && result.data).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
    expect(mock.chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    expect(consoleInfo.mock.calls[0][1]).toMatchObject({
      format: 'custom-program-days-v1',
      provenance_bucket: 'diagnostic-auto',
      result: 'WARNING',
      difference_codes: expect.arrayContaining([
        'LEGACY_NAME_REFERENCE', 'AI_MUSCLE_PRIMARY_UNMAPPED', 'AI_METADATA_UNMAPPED',
        'AI_PROVIDER_METADATA_UNAVAILABLE', 'TECHNIQUE_SEMANTICS_UNMAPPED',
        'REST_DAYS_NOT_PERSISTED', 'DAY_NUMBER_NON_AUTHORITATIVE',
        'DIAGNOSTIC_ID_NOT_PERSISTED', 'VOLUME_DELTA_NOT_PERSISTED',
        'PREVIOUS_PROGRAM_LINK_UNAVAILABLE',
      ]),
    })
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toMatch(/synthetic-diagnostic|Programme diagnostic|Développé|Rowing|Goblet/)
    consoleInfo.mockRestore()
  })

  it('keeps unprepared active programs legacy-only and contains observer failures', async () => {
    for (const source of ['cron_auto', 'free_session', 'import', 'unknown', null, undefined]) {
      const row = { id: `program-${source}`, user_id: 'client-id', name: 'Program', days: [], source, is_active: true }
      const mock = clientWith({ data: row, error: null })
      const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
      const result = await createTrainingProgramRepository(mock.client).findActivePersonalProgramForClient('client-id')
      expect(result.ok && result.data).toBe(row)
      expect(mock.from).toHaveBeenCalledTimes(1)
      expect(consoleInfo).not.toHaveBeenCalled()
      consoleInfo.mockRestore()
    }

    const row = {
      id: 'manual', user_id: 'client-id', name: 'Program', source: 'manual', is_active: true,
      days: [{ name: 'Push', exercises: [{ exercise_id: 'bench', name: 'Bench', sets: 3, reps: 8 }] }],
    }
    const mock = clientWith({ data: row, error: null })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('observer failed') })
    const result = await createTrainingProgramRepository(mock.client).findActivePersonalProgramForClient('client-id')
    expect(result.ok && result.data).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    consoleInfo.mockRestore()

    const aiRow = buildPersistedAiCustomProgramFixture().row
    const aiMock = clientWith({ data: aiRow, error: null })
    const aiConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('observer failed') })
    const aiResult = await createTrainingProgramRepository(aiMock.client)
      .findActivePersonalProgramForClient('synthetic-ai-client')
    expect(aiResult.ok && aiResult.data).toBe(aiRow)
    expect(aiMock.from).toHaveBeenCalledTimes(1)
    aiConsoleInfo.mockRestore()

    const onboardingRow = buildPersistedOnboardingCustomProgramFixture().row
    const onboardingMock = clientWith({ data: onboardingRow, error: null })
    const onboardingConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('observer failed') })
    const onboardingResult = await createTrainingProgramRepository(onboardingMock.client)
      .findActivePersonalProgramForClient('synthetic-onboarding-client')
    expect(onboardingResult.ok && onboardingResult.data).toBe(onboardingRow)
    expect(onboardingMock.from).toHaveBeenCalledTimes(1)
    onboardingConsoleInfo.mockRestore()

    const diagnosticRow = buildPersistedDiagnosticCustomProgramFixture().row
    const diagnosticMock = clientWith({ data: diagnosticRow, error: null })
    const diagnosticConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('observer failed') })
    const diagnosticResult = await createTrainingProgramRepository(diagnosticMock.client)
      .findActivePersonalProgramForClient('synthetic-diagnostic-client')
    expect(diagnosticResult.ok && diagnosticResult.data).toBe(diagnosticRow)
    expect(diagnosticMock.from).toHaveBeenCalledTimes(1)
    diagnosticConsoleInfo.mockRestore()
  })

  it('keeps active-personal read failures authoritative and skips shadow observation', async () => {
    const mock = clientWith({ data: null, error: { code: 'PGRST000', message: 'unavailable' } })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).findActivePersonalProgramForClient('client-id')
    expect(result).toMatchObject({ ok: false, kind: 'failure' })
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(consoleInfo).not.toHaveBeenCalled()
    consoleInfo.mockRestore()
  })

  it('propagates assigned-program read failures without invoking shadow observation', async () => {
    const mock = clientWith({ data: null, error: { code: 'PGRST000', message: 'unavailable' } })
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).listAssignedProgramsForClient('client-1', {
      shadowSelection: { consumer: 'dashboard-client' },
    })
    expect(result).toMatchObject({ ok: false, kind: 'failure' })
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(consoleInfo).not.toHaveBeenCalled()
    consoleInfo.mockRestore()
  })

  it('paginates coach templates with a stable timestamp/id cursor and strict bounds', async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
      created_at: '2026-07-19T10:00:00.000Z',
    }))
    const first = clientWith({ data: rows, error: null })
    const firstResult = await createTrainingProgramRepository(first.client).listCoachProgramPage('coach-id', { limit: 20 })
    expect(firstResult.ok && firstResult.data.items).toHaveLength(20)
    expect(firstResult.ok && firstResult.data.hasMore).toBe(true)
    expect(first.chain.eq).toHaveBeenCalledWith('is_template', true)
    expect(first.chain.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false, nullsFirst: false })
    expect(first.chain.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true })
    expect(first.chain.limit).toHaveBeenCalledWith(21)

    if (!firstResult.ok || !firstResult.data.nextCursor) throw new Error('cursor expected')
    const next = clientWith({ data: [], error: null })
    await createTrainingProgramRepository(next.client).listCoachProgramPage('coach-id', { cursor: firstResult.data.nextCursor, limit: 999 })
    expect(next.chain.or).toHaveBeenCalledWith(expect.stringContaining('created_at.lt.2026-07-19T10:00:00.000Z'))
    expect(next.chain.or).toHaveBeenCalledWith(expect.stringContaining('id.gt.00000000-0000-0000-0000-000000000019'))
    expect(next.chain.limit).toHaveBeenCalledWith(51)
  })

  it('rejects invalid program cursors without querying Supabase', async () => {
    const mock = clientWith({ data: [], error: null })
    const result = await createTrainingProgramRepository(mock.client).listCoachProgramPage('coach-id', { cursor: 'invalid' })
    expect(result).toEqual({ ok: false, kind: 'failure', error: { kind: 'unexpected', contextCode: 'INVALID_CURSOR' } })
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('marks an exactly full or empty final template page as complete', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
      created_at: null,
    }))
    const full = await createTrainingProgramRepository(clientWith({ data: rows, error: null }).client)
      .listCoachProgramPage('coach-id', { limit: 20 })
    expect(full.ok && full.data).toMatchObject({ hasMore: false, nextCursor: null })
    expect(full.ok && full.data.items).toHaveLength(20)

    const empty = await createTrainingProgramRepository(clientWith({ data: [], error: null }).client)
      .listCoachProgramPage('coach-id')
    expect(empty).toEqual({ ok: true, data: { items: [], hasMore: false, nextCursor: null } })
  })

  it('finds a coach program by both id and owner, and distinguishes absence', async () => {
    const found = clientWith({ data: { id: 'program-id' }, error: null })
    const result = await createTrainingProgramRepository(found.client).findProgramByIdForOwner('program-id', 'coach-id')
    expect(result).toEqual({ ok: true, data: { id: 'program-id' } })
    expect(found.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['id', 'program-id'], ['coach_id', 'coach-id'],
    ])

    const absent = clientWith({ data: null, error: null })
    expect(await createTrainingProgramRepository(absent.client).findProgramByIdForOwner('missing', 'coach-id'))
      .toEqual({ ok: false, kind: 'not_found' })
  })

  it('scopes sessions, completions and records to the client parameter', async () => {
    const mock = clientWith({ data: [], error: null })
    const repository = createTrainingSessionRepository(mock.client)

    await repository.listWorkoutSessionsForClient('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(WORKOUT_SESSION_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-id')

    await repository.listDashboardWorkoutSessions('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(DASHBOARD_WORKOUT_SESSION_PROJECTION)
    expect(mock.chain.limit).toHaveBeenCalledWith(90)

    await repository.listCompletionsForClient('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(COMPLETION_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('client_id', 'client-id')

    await repository.listCompletionsForProgram('client-id', 'assignment-id')
    expect(mock.chain.eq).toHaveBeenCalledWith('program_id', 'assignment-id')

    await repository.listPersonalRecordsForClient('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_RECORD_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-id')

    await repository.hasCompletedWorkout('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith('id', { count: 'exact', head: true })

    await repository.listCompletedWorkoutDates('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(COMPLETED_WORKOUT_DATE_PROJECTION)
    expect(mock.chain.limit).toHaveBeenCalledWith(400)
  })

  it('bounds catalog reads, scopes custom exercises and supports a safe search', async () => {
    const mock = clientWith({ data: [], error: null })
    const repository = createTrainingExerciseRepository(mock.client)
    await repository.listCatalogExercises({ search: '100%_press', limit: 9999 })
    expect(mock.from).toHaveBeenLastCalledWith('exercises_db')
    expect(mock.chain.select).toHaveBeenLastCalledWith(CATALOG_EXERCISE_PROJECTION)
    expect(mock.chain.limit).toHaveBeenCalledWith(500)
    expect(mock.chain.ilike).toHaveBeenCalledWith('name', '%100\\%\\_press%')

    await repository.listCustomExercisesForOwner('owner-id')
    expect(mock.from).toHaveBeenLastCalledWith('custom_exercises')
    expect(mock.chain.select).toHaveBeenLastCalledWith(CUSTOM_EXERCISE_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'owner-id')
  })

  it('expurgates Supabase failures instead of returning raw details', async () => {
    const mock = clientWith({ data: null, error: { code: '42501', message: 'private SQL detail' } })
    const result = await createTrainingExerciseRepository(mock.client).findExerciseById('exercise-id')
    expect(result).toEqual({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(JSON.stringify(result)).not.toContain('private SQL detail')
  })

  it('contains no wildcard projection, client construction or forbidden framework import', () => {
    const files = ['exercise.ts', 'program.ts', 'session.ts', 'index.ts']
    const source = files.map(file => readFileSync(new URL(`../../lib/repositories/training/${file}`, import.meta.url), 'utf8')).join('\n')
    expect(source).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)|createClient|supabase\/admin|supabase\/browser|supabase\/server/)
    expect(source).not.toContain('service_role')
  })
})
