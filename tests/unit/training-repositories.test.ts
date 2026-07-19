import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
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

    await repository.listPersonalProgramsForClient('client-session-id')
    expect(mock.from).toHaveBeenLastCalledWith('custom_programs')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-session-id')

    await repository.findActivePersonalProgramForClient('client-session-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_PROGRAM_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('is_active', true)
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
