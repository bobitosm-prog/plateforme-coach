import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { createActiveWorkoutDraft, type ActiveWorkoutDraft } from '@/lib/training/active-workout-draft'
import {
  WorkoutCriticalSaveError,
  persistCriticalWorkout,
  type CompletedWorkoutData,
  type CriticalWorkoutPersistencePort,
} from '@/lib/training/session-persistence'

const data: CompletedWorkoutData = {
  duration: 1_200_000,
  completedSets: 2,
  totalSets: 2,
  totalVolume: 800,
  exercises: [{
    name: 'Squat',
    muscle: 'legs',
    setsTarget: 2,
    sets: [
      { weight: 50, reps: 8, rir: 2 },
      { weight: 50, reps: 8, rir: 2 },
    ],
  }],
}

function draft(remoteSessionId: string | null = null): ActiveWorkoutDraft {
  return {
    ...createActiveWorkoutDraft({
      userId: 'user-1',
      programSource: 'personal',
      programId: 'program-1',
      sessionKey: 'program-1:lundi',
      sessionName: 'Jambes',
      exercises: [{ name: 'Squat', sets: 2 }],
      draftId: 'draft-1',
      now: new Date('2026-08-28T10:00:00.000Z'),
    }),
    remoteSessionId,
  }
}

function port(overrides: Partial<CriticalWorkoutPersistencePort> = {}): CriticalWorkoutPersistencePort {
  return {
    createSession: vi.fn().mockResolvedValue('session-1'),
    countSessionSets: vi.fn().mockResolvedValue(0),
    insertSessionSets: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('Training V2 critical session persistence', () => {
  it('retains a retryable local draft when workout_sessions fails', async () => {
    const persisted: ActiveWorkoutDraft[] = []
    const raw = new Error('sensitive database details')

    await expect(persistCriticalWorkout({
      draft: draft(),
      data,
      port: port({ createSession: vi.fn().mockRejectedValue(raw) }),
      persistDraft: value => persisted.push(value),
    })).rejects.toMatchObject({
      code: 'WORKOUT_SESSION_SAVE_FAILED',
      message: 'La séance n’a pas pu être sauvegardée. Réessaie sans fermer cet écran.',
    })

    expect(persisted.map(value => value.status)).toEqual(['saving', 'save_error'])
    expect(JSON.stringify(persisted)).not.toContain(raw.message)
  })

  it('retains the known session id when workout_sets fails', async () => {
    const persisted: ActiveWorkoutDraft[] = []
    await expect(persistCriticalWorkout({
      draft: draft(),
      data,
      port: port({ insertSessionSets: vi.fn().mockRejectedValue(new Error('raw')) }),
      persistDraft: value => persisted.push(value),
    })).rejects.toBeInstanceOf(WorkoutCriticalSaveError)

    expect(persisted.at(-1)).toMatchObject({
      status: 'save_error',
      remoteSessionId: 'session-1',
      errorCode: 'WORKOUT_SETS_SAVE_FAILED',
    })
  })

  it('awaits both critical writes before marking the draft completed', async () => {
    const events: string[] = []
    const persisted: ActiveWorkoutDraft[] = []
    const criticalPort = port({
      createSession: vi.fn(async () => { events.push('session'); return 'session-1' }),
      countSessionSets: vi.fn(async () => 0),
      insertSessionSets: vi.fn(async () => { events.push('sets') }),
      completeSession: vi.fn(async () => { events.push('complete') }),
    })

    const result = await persistCriticalWorkout({
      draft: draft(), data, port: criticalPort,
      persistDraft: value => persisted.push(value),
    })

    expect(events).toEqual(['session', 'sets', 'complete'])
    expect(result.draft.status).toBe('completed')
    expect(persisted.at(-1)?.status).toBe('completed')
  })

  it('reuses a known remote session id on retry and does not recreate the session', async () => {
    const createSession = vi.fn().mockResolvedValue('unexpected')
    const criticalPort = port({ createSession })

    await persistCriticalWorkout({
      draft: draft('session-known'), data, port: criticalPort,
      persistDraft: () => undefined,
    })

    expect(createSession).not.toHaveBeenCalled()
    expect(criticalPort.insertSessionSets).toHaveBeenCalledWith('session-known', data)
  })

  it('does not intentionally duplicate sets when a previous response was lost', async () => {
    const criticalPort = port({ countSessionSets: vi.fn().mockResolvedValue(2) })

    await persistCriticalWorkout({
      draft: draft('session-known'), data, port: criticalPort,
      persistDraft: () => undefined,
    })

    expect(criticalPort.insertSessionSets).not.toHaveBeenCalled()
    expect(criticalPort.completeSession).toHaveBeenCalledWith('session-known')
  })

  it('fails closed on a partial set batch instead of duplicating critical writes', async () => {
    const criticalPort = port({ countSessionSets: vi.fn().mockResolvedValue(1) })

    await expect(persistCriticalWorkout({
      draft: draft('session-known'), data, port: criticalPort,
      persistDraft: () => undefined,
    })).rejects.toMatchObject({ code: 'WORKOUT_PARTIAL_SETS_FOUND' })
    expect(criticalPort.insertSessionSets).not.toHaveBeenCalled()
    expect(criticalPort.completeSession).not.toHaveBeenCalled()
  })

  it('removes the local draft only after critical persistence and has no parallel TrainingTab writer', () => {
    const hook = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')
    const tab = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
    const persistIndex = hook.indexOf('const critical = await persistCriticalWorkout({')
    const removeIndex = hook.indexOf('removeActiveWorkoutDraft(localStorage, critical.draft.draftId)')
    expect(persistIndex).toBeGreaterThan(-1)
    expect(removeIndex).toBeGreaterThan(persistIndex)
    expect(tab).not.toContain("from('workout_sessions').insert")
    expect(tab).not.toContain("from('workout_sets').insert")
  })
})
