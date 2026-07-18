import { describe, expect, it, vi } from 'vitest'
import {
  buildCurrentWeekSchedule,
  createProgramBuilderCustomExercise,
  loadProgramBuilderData,
  loadProgramExerciseVariants,
  saveProgramAndSynchronizeCalendar,
  type BuilderRecord,
  type PortResult,
  type ProgramBuilderPersistencePort,
} from '../../lib/training/program-builder-persistence'
import { createProgramEditorWeek } from '../../lib/training/program-editor-model'

const ok = <T>(data: T): PortResult<T> => ({ data, error: null })
const failed = <T>(data: T): PortResult<T> => ({ data, error: new Error('sensitive database detail') })

function port(overrides: Partial<ProgramBuilderPersistencePort> = {}): ProgramBuilderPersistencePort {
  return {
    listCatalogExercises: vi.fn(async () => ok([{ id: 'catalog-1' }])),
    listCustomExercises: vi.fn(async () => ok([{ id: 'custom-1' }])),
    findProfileGender: vi.fn(async () => ok({ gender: 'female' })),
    createCustomExercise: vi.fn(async payload => ok(payload)),
    updateProgram: vi.fn(async () => ok(null)),
    createProgram: vi.fn(async () => ok(null)),
    deletePendingSchedule: vi.fn(async () => ok(null)),
    createScheduledSessions: vi.fn(async () => ok(null)),
    findVariantGroup: vi.fn(async () => ok({ variant_group: 'press' })),
    listSimilarExercises: vi.fn(async () => ok([])),
    listVariantExercises: vi.fn(async () => ok([{ name: 'Incline press' }])),
    ...overrides,
  }
}

describe('ProgramBuilder persistence load contract', () => {
  it('loads the three current projections concurrently and scopes private data to the authenticated owner', async () => {
    const adapter = port()
    const result = await loadProgramBuilderData(adapter, 'owner-1')
    expect(result).toEqual({ status: 'success', catalogExercises: [{ id: 'catalog-1' }], customExercises: [{ id: 'custom-1' }], gender: 'female', failures: [] })
    expect(adapter.listCustomExercises).toHaveBeenCalledWith('owner-1')
    expect(adapter.findProfileGender).toHaveBeenCalledWith('owner-1')
  })

  it('distinguishes partial and total failures without exposing provider errors', async () => {
    const partial = await loadProgramBuilderData(port({ listCatalogExercises: vi.fn(async () => failed([])) }), 'owner-1')
    expect(partial.status).toBe('partial')
    expect(partial.failures).toEqual([{ code: 'catalog_load_failed' }])
    expect(JSON.stringify(partial)).not.toContain('sensitive database detail')

    const total = await loadProgramBuilderData(port({
      listCatalogExercises: vi.fn(async () => failed([])),
      listCustomExercises: vi.fn(async () => failed([])),
      findProfileGender: vi.fn(async () => failed(null)),
    }), 'owner-1')
    expect(total.status).toBe('failed')
  })

  it('returns a stable absent profile fallback without inventing gender', async () => {
    const result = await loadProgramBuilderData(port({ findProfileGender: vi.fn(async () => ok(null)) }), 'owner-1')
    expect(result.gender).toBeNull()
  })
})

describe('ProgramBuilder persistence writes and partial failures', () => {
  const now = () => new Date('2026-07-15T12:00:00.000Z')

  it('creates an exercise with the exact payload and does not mutate it', async () => {
    const adapter = port()
    const payload: BuilderRecord = { user_id: 'owner-1', name: 'Synthetic press', is_private: true }
    const snapshot = structuredClone(payload)
    const result = await createProgramBuilderCustomExercise(adapter, payload)
    expect(adapter.createCustomExercise).toHaveBeenCalledWith(payload)
    expect(result.status).toBe('success')
    expect(payload).toEqual(snapshot)
  })

  it('keeps save, calendar delete and calendar insert in the historical order', async () => {
    const calls: string[] = []
    const adapter = port({
      createProgram: vi.fn(async payload => { calls.push('save'); expect(payload).toMatchObject({ name: 'Plan', is_active: false }); return ok(null) }),
      deletePendingSchedule: vi.fn(async () => { calls.push('delete'); return ok(null) }),
      createScheduledSessions: vi.fn(async () => { calls.push('insert'); return ok(null) }),
    })
    const days = createProgramEditorWeek(1)
    days[0].name = 'Push'
    const result = await saveProgramAndSynchronizeCalendar(adapter, { ownerUserId: 'owner-1', payload: { name: 'Plan' }, days, now })
    expect(calls).toEqual(['save', 'delete', 'insert'])
    expect(result).toEqual({ status: 'success', scheduledCount: 1, failures: [] })
  })

  it('preserves update payload and skips schedule insert for a rest-only week', async () => {
    const adapter = port()
    const payload = { name: 'Legacy', days: [{ weekday: 'Lundi' }] }
    const snapshot = structuredClone(payload)
    const result = await saveProgramAndSynchronizeCalendar(adapter, { ownerUserId: 'owner-1', editProgramId: 'program-1', payload, days: createProgramEditorWeek(0), now })
    expect(adapter.updateProgram).toHaveBeenCalledWith('program-1', payload)
    expect(adapter.createProgram).not.toHaveBeenCalled()
    expect(adapter.createScheduledSessions).not.toHaveBeenCalled()
    expect(result.status).toBe('success')
    expect(payload).toEqual(snapshot)
  })

  it.each([
    ['save_failed', { createProgram: vi.fn(async () => failed(null)) }, 'program_save_failed'],
    ['partial', { deletePendingSchedule: vi.fn(async () => failed(null)) }, 'calendar_delete_failed'],
    ['partial', { createScheduledSessions: vi.fn(async () => failed(null)) }, 'calendar_insert_failed'],
  ] as const)('characterizes %s while preserving subsequent historical operations', async (status, overrides, code) => {
    const adapter = port(overrides)
    const result = await saveProgramAndSynchronizeCalendar(adapter, { ownerUserId: 'owner-1', payload: { name: 'Plan' }, days: createProgramEditorWeek(1), now })
    expect(result.status).toBe(status)
    expect(result.failures).toContainEqual({ code })
    expect(JSON.stringify(result)).not.toContain('sensitive database detail')
    expect(adapter.deletePendingSchedule).toHaveBeenCalled()
    expect(adapter.createScheduledSessions).toHaveBeenCalled()
  })

  it('builds the exact current-week schedule with a controlled clock', () => {
    const days = createProgramEditorWeek(2)
    days[0].name = 'Push'
    days[1].name = 'Pull'
    expect(buildCurrentWeekSchedule('owner-1', days, now)).toEqual({
      from: '2026-07-13', to: '2026-07-19',
      sessions: [
        { user_id: 'owner-1', title: 'Push', session_type: 'custom', scheduled_date: '2026-07-13', scheduled_time: '08:00', duration_min: 60, completed: false },
        { user_id: 'owner-1', title: 'Pull', session_type: 'custom', scheduled_date: '2026-07-14', scheduled_time: '08:00', duration_min: 60, completed: false },
      ],
    })
  })
})

describe('ProgramBuilder variant loading', () => {
  it('uses the canonical group when present and the legacy name fallback otherwise', async () => {
    const grouped = port()
    expect((await loadProgramExerciseVariants(grouped, 'Press')).variants).toEqual([{ name: 'Incline press' }])
    expect(grouped.listVariantExercises).toHaveBeenCalledWith('press', 'Press')

    const fallback = port({ findVariantGroup: vi.fn(async () => ok(null)), listSimilarExercises: vi.fn(async () => ok([{ name: 'Press machine' }])) })
    expect((await loadProgramExerciseVariants(fallback, 'Press horizontal')).variants).toEqual([{ name: 'Press machine' }])
    expect(fallback.listSimilarExercises).toHaveBeenCalledWith('Press horizontal', 'Press horizontal')
  })
})
