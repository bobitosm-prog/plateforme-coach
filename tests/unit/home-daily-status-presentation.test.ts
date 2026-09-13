import { describe, expect, it } from 'vitest'

import {
  deriveDailyStatusPresentation,
  resolveDailyNutritionStatus,
  resolveDailyRecoveryStatus,
  resolveDailyTrainingStatus,
} from '@/lib/home/daily-status-presentation'
import { buildHomeViewModel, type HomeViewModel, type HomeViewModelInput } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'
import type { MuscleRecovery, RecoveryStatus, RecoveryZone } from '@/lib/home/recovery-model'

const capabilities = { ai: true, training: true, nutrition: true, coachManaged: false }
const session = { id: 's1', title: 'Push', exercises: [{ name: 'Press' }], scheduledAt: null, isRest: false }

function recoveryZone(zone: RecoveryZone, status: Exclude<RecoveryStatus, 'unknown'>): MuscleRecovery {
  return {
    zone,
    status,
    lastWorkedAt: '2026-09-12T08:00:00.000Z',
    elapsedHours: 12,
    window: { minHours: 24, maxHours: 36 },
    setCount: 3,
    exercises: ['Test'],
    confidence: 'high',
    source: 'exercise_metadata',
    medianRir: 2,
  }
}

function makeModel(overrides: Partial<HomeViewModelInput> = {}): HomeViewModel {
  return buildHomeViewModel({
    today: getHomeDayWindow(new Date('2026-09-13T12:00:00Z')),
    identity: { firstName: 'Marco' },
    training: { session, source: 'custom_program', isCompleted: true, hasProgram: true, weeklyPlanned: 4, weeklyCompleted: 2 },
    nutrition: { state: 'ready', caloriesConsumed: 2_000, caloriesTarget: 2_200, hasPlan: true },
    recovery: { state: 'ready', model: { status: 'probably_ready', zones: [], generatedAt: '2026-09-13T12:00:00.000Z' } },
    coach: { relationStatus: 'not_found' },
    capabilities,
    ...overrides,
  })
}

describe('daily status presentation', () => {
  it('derives every training state without inventing session data', () => {
    expect(resolveDailyTrainingStatus(makeModel({ training: { state: 'loading' } }).training)).toBe('loading')
    expect(resolveDailyTrainingStatus(makeModel({ training: { state: 'error' } }).training)).toBe('error')
    expect(resolveDailyTrainingStatus(makeModel({ training: { session, hasProgram: true } }).training)).toBe('scheduled')
    expect(resolveDailyTrainingStatus(makeModel().training)).toBe('completed')
    expect(resolveDailyTrainingStatus(makeModel({ training: { session: { ...session, isRest: true }, hasProgram: true } }).training)).toBe('rest')
    expect(resolveDailyTrainingStatus(makeModel({ training: { state: 'empty', hasProgram: false } }).training)).toBe('empty')
  })

  it('distinguishes nutrition empty, partial, ready, loading and error states', () => {
    expect(resolveDailyNutritionStatus(makeModel({ nutrition: { state: 'empty', hasPlan: true } }).nutrition)).toBe('empty')
    expect(resolveDailyNutritionStatus(makeModel({ nutrition: { state: 'ready', caloriesConsumed: 800, caloriesTarget: null, hasPlan: true } }).nutrition)).toBe('incomplete')
    expect(resolveDailyNutritionStatus(makeModel().nutrition)).toBe('ready')
    expect(resolveDailyNutritionStatus(makeModel({ nutrition: { state: 'loading' } }).nutrition)).toBe('loading')
    expect(resolveDailyNutritionStatus(makeModel({ nutrition: { state: 'error' } }).nutrition)).toBe('error')
  })

  it('distinguishes every recovery state', () => {
    expect(resolveDailyRecoveryStatus(makeModel().recovery)).toBe('probably_ready')
    expect(resolveDailyRecoveryStatus(makeModel({ recovery: { state: 'ready', model: null } }).recovery)).toBe('unknown')
    expect(resolveDailyRecoveryStatus(makeModel({ recovery: { state: 'loading' } }).recovery)).toBe('loading')
    expect(resolveDailyRecoveryStatus(makeModel({ recovery: { state: 'error' } }).recovery)).toBe('error')
  })

  it('applies summary priority: error, loading, recovery, training, nutrition, on track', () => {
    const riskyRecovery = { state: 'ready' as const, model: { status: 'leave_alone' as const, zones: [recoveryZone('quadriceps', 'leave_alone')], generatedAt: '2026-09-13T12:00:00.000Z' } }
    expect(deriveDailyStatusPresentation(makeModel({ errors: { nutrition: 'READ_FAILED' }, recovery: riskyRecovery })).summary).toBe('error')
    expect(deriveDailyStatusPresentation(makeModel({ nutrition: { state: 'loading' }, recovery: riskyRecovery })).summary).toBe('loading')
    expect(deriveDailyStatusPresentation(makeModel({ recovery: riskyRecovery })).summary).toBe('protect_recovery')
    expect(deriveDailyStatusPresentation(makeModel({ training: { session, hasProgram: true }, nutrition: { state: 'empty' } })).summary).toBe('training_planned')
    expect(deriveDailyStatusPresentation(makeModel({ nutrition: { state: 'empty' } })).summary).toBe('nutrition_incomplete')
    expect(deriveDailyStatusPresentation(makeModel()).summary).toBe('on_track')
  })

  it('selects the initial domain with the required priority', () => {
    const riskyRecovery = { state: 'ready' as const, model: { status: 'leave_alone' as const, zones: [recoveryZone('back', 'leave_alone')], generatedAt: '2026-09-13T12:00:00.000Z' } }
    expect(deriveDailyStatusPresentation(makeModel({ training: { session, hasProgram: true }, nutrition: { state: 'empty' }, recovery: riskyRecovery })).initialDomain).toBe('recovery')
    expect(deriveDailyStatusPresentation(makeModel({ training: { session, hasProgram: true }, nutrition: { state: 'empty' } })).initialDomain).toBe('training')
    expect(deriveDailyStatusPresentation(makeModel({ nutrition: { state: 'empty' } })).initialDomain).toBe('nutrition')
    expect(deriveDailyStatusPresentation(makeModel()).initialDomain).toBe('training')
  })

  it('counts recovery states and keeps at most three real priority zones', () => {
    const model = makeModel({
      recovery: {
        state: 'ready',
        model: {
          status: 'leave_alone',
          zones: [
            recoveryZone('calves', 'recovering'),
            recoveryZone('quadriceps', 'leave_alone'),
            recoveryZone('hamstrings', 'leave_alone'),
            recoveryZone('chest', 'probably_ready'),
          ],
          generatedAt: '2026-09-13T12:00:00.000Z',
        },
      },
    })
    const recovery = deriveDailyStatusPresentation(model).recovery
    expect(recovery.counts).toEqual({ leave_alone: 2, recovering: 1, probably_ready: 1 })
    expect(recovery.priorityZones).toEqual(['quadriceps', 'hamstrings', 'calves'])
  })

  it('derives actions and factual counts only from the training model', () => {
    const scheduled = deriveDailyStatusPresentation(makeModel({ training: { session, hasProgram: true, weeklyPlanned: 4, weeklyCompleted: 2 } })).training
    expect(scheduled).toMatchObject({ action: 'start_session', exerciseCount: 1, weeklyCompleted: 2, weeklyPlanned: 4 })
    expect(deriveDailyStatusPresentation(makeModel()).training.action).toBe('open_session')
    expect(deriveDailyStatusPresentation(makeModel({ training: { session: { ...session, isRest: true }, hasProgram: true } })).training.action).toBe('open_program')
    expect(deriveDailyStatusPresentation(makeModel({ training: { state: 'empty', hasProgram: false } })).training).toMatchObject({ action: 'start_free_session', exerciseCount: null })
  })
})
