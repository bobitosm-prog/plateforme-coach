import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createTrainingDashboardLoader } from '@/lib/client-dashboard/training-dashboard-loader'

const assignedProgram = {
  id: 'assignment-1', client_id: 'client-1', coach_id: 'coach-1', training_program_id: 'template-1',
  program: [{ name: 'Jour 1', exercises: [{ name: 'Squat' }] }],
  created_at: '2026-07-17T10:00:00Z', updated_at: '2026-07-17T10:00:00Z',
}
const personalProgram = {
  id: 'personal-1', user_id: 'client-1', name: 'Personnel', description: null,
  days: [{ name: 'Jour libre', exercises: [] }], phases: null, source: 'manual', is_active: true,
  scheduled: false, start_date: null, current_week: 1, total_weeks: 4,
  created_at: '2026-07-17T10:00:00Z', updated_at: '2026-07-17T10:00:00Z',
}

const success = <T>(data: T) => ({ ok: true as const, data })

function setup(overrides: Record<string, unknown> = {}) {
  const programRepository = {
    listAssignedProgramsForClient: vi.fn(async () => success([assignedProgram])),
    findActivePersonalProgramForClient: vi.fn(async () => success(personalProgram)),
  }
  const sessionRepository = {
    listDashboardWorkoutSessions: vi.fn(async () => success([{ id: 'session-1', workout_sets: [] }])),
    listCompletionsForClient: vi.fn(async () => success([
      { id: 'completion-2', session_index: 2, completed_at: '2026-07-17T10:00:00Z' },
      { id: 'completion-1', session_index: 1, completed_at: '2026-07-16T10:00:00Z' },
    ])),
    hasCompletedWorkout: vi.fn(async () => success(true)),
    listCompletedWorkoutDates: vi.fn(async () => success([
      { created_at: '2026-07-17T10:00:00Z' }, { created_at: null },
    ])),
    listPersonalRecordsForClient: vi.fn(async () => success([{ id: 'record-1', value: 100 }])),
  }
  Object.assign(programRepository, overrides)
  Object.assign(sessionRepository, overrides)
  const loader = createTrainingDashboardLoader({
    programRepository: programRepository as never,
    sessionRepository: sessionRepository as never,
  })
  return { loader, programRepository, sessionRepository }
}

describe('client training dashboard loader', () => {
  it('preserves complete legacy dashboard data and stable repository order', async () => {
    const { loader } = setup()
    const result = await loader.load('client-1')
    expect(result).toMatchObject({
      ok: true,
      data: {
        assignedProgram: { id: 'assignment-1', coach_id: 'coach-1' },
        activePersonalProgram: { id: 'personal-1' },
        workoutSessions: [{ id: 'session-1', workout_sets: [] }],
        completions: [{ session_index: 2 }, { session_index: 1 }],
        hasTrainedBefore: true,
        sessionDates: [{ created_at: '2026-07-17T10:00:00Z' }],
      },
    })
    if (result.ok) {
      expect(result.data.coachProgram?.lundi?.exercises).toEqual([{ name: 'Squat' }])
    }
  })

  it('returns explicit empty values when repositories confirm no data', async () => {
    const { loader } = setup({
      listAssignedProgramsForClient: vi.fn(async () => success([])),
      findActivePersonalProgramForClient: vi.fn(async () => ({ ok: false, kind: 'not_found' as const })),
      listDashboardWorkoutSessions: vi.fn(async () => success([])),
      listCompletionsForClient: vi.fn(async () => success([])),
      hasCompletedWorkout: vi.fn(async () => success(false)),
      listCompletedWorkoutDates: vi.fn(async () => success([])),
    })
    expect(await loader.load('client-1')).toEqual({
      ok: true,
      data: {
        workoutSessions: [], assignedProgram: null, coachProgram: null, activePersonalProgram: null,
        completions: [], hasTrainedBefore: false, sessionDates: [],
      },
    })
  })

  it('returns an expurgated recoverable error with the failing source', async () => {
    const { loader } = setup({
      listDashboardWorkoutSessions: vi.fn(async () => ({
        ok: false, kind: 'failure' as const,
        error: { kind: 'unavailable' as const, contextCode: 'PGRST000', raw: 'private database detail' },
      })),
    })
    const result = await loader.load('client-1')
    expect(result).toEqual({ ok: false, error: { kind: 'unavailable', sources: ['workout_sessions'] } })
    expect(JSON.stringify(result)).not.toContain('private database detail')
  })

  it('passes the verified client scope to every repository call', async () => {
    const { loader, programRepository, sessionRepository } = setup()
    await loader.load('verified-client')
    for (const method of Object.values(programRepository)) expect(method).toHaveBeenCalledWith('verified-client')
    for (const [name, method] of Object.entries(sessionRepository)) {
      if (name !== 'listPersonalRecordsForClient') expect(method).toHaveBeenCalledWith('verified-client')
    }
  })

  it('does not mutate legacy inputs while normalizing the coach snapshot', async () => {
    const frozenProgram = Object.freeze([Object.freeze({ name: 'Jour 1', exercises: Object.freeze([]) })])
    const frozenAssignment = Object.freeze({ ...assignedProgram, program: frozenProgram })
    const { loader } = setup({ listAssignedProgramsForClient: vi.fn(async () => success([frozenAssignment])) })
    await loader.load('client-1')
    expect(frozenAssignment.program).toBe(frozenProgram)
    expect(frozenProgram[0].name).toBe('Jour 1')
  })

  it('bounds completion history and exposes records through the same scoped boundary', async () => {
    const completions = Array.from({ length: 60 }, (_, index) => ({ id: `c-${index}`, session_index: index, completed_at: '2026-07-17T10:00:00Z' }))
    const { loader, sessionRepository } = setup({ listCompletionsForClient: vi.fn(async () => success(completions)) })
    const loaded = await loader.load('client-1')
    expect(loaded.ok && loaded.data.completions).toHaveLength(50)
    expect(await loader.loadPersonalRecords('client-1')).toEqual(success([{ id: 'record-1', value: 100 }]))
    expect(sessionRepository.listPersonalRecordsForClient).toHaveBeenCalledWith('client-1')
  })

  it('has no data client construction, wildcard query, or framework dependency', () => {
    const source = readFileSync(new URL('../../lib/client-dashboard/training-dashboard-loader.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/select\(|createClient|supabase\/admin|supabase\/browser|supabase\/server/)
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)/)
  })
})
