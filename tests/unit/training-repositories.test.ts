import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import {
  ASSIGNED_PROGRAM_PROJECTION,
  CATALOG_EXERCISE_PROJECTION,
  COACH_PROGRAM_PROJECTION,
  COMPLETION_PROJECTION,
  CUSTOM_EXERCISE_PROJECTION,
  PERSONAL_PROGRAM_PROJECTION,
  PERSONAL_RECORD_PROJECTION,
  WORKOUT_SESSION_PROJECTION,
  createTrainingExerciseRepository,
  createTrainingProgramRepository,
  createTrainingSessionRepository,
} from '../../lib/repositories/training'

type QueryResult = { data: unknown; error: unknown }

function clientWith(result: QueryResult) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'ilike']) {
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

    await repository.listCompletionsForClient('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(COMPLETION_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('client_id', 'client-id')

    await repository.listCompletionsForProgram('client-id', 'assignment-id')
    expect(mock.chain.eq).toHaveBeenCalledWith('program_id', 'assignment-id')

    await repository.listPersonalRecordsForClient('client-id')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PERSONAL_RECORD_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-id')
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
