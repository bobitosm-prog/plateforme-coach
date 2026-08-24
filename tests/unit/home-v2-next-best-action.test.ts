import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveDailyRecoveryStatus,
  resolveDailyTrainingStatus,
} from '@/app/components/home-v2/DailyStatus'
import { buildHomeViewModel, type HomeViewModel, type HomeViewModelInput } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'
import { resolveNextBestAction } from '@/lib/home/next-best-action'

const capabilities = { ai: true, training: true, nutrition: true, coachManaged: false }
const session = { id: 's1', title: 'Push', exercises: [{ name: 'Press' }], scheduledAt: null, isRest: false }

function makeModel(overrides: Partial<HomeViewModelInput> = {}): HomeViewModel {
  return buildHomeViewModel({
    today: getHomeDayWindow(new Date('2026-08-24T12:00:00Z')),
    identity: { firstName: 'Marco' },
    training: { session, source: 'custom_program', isCompleted: true, hasProgram: true },
    nutrition: { state: 'ready', caloriesConsumed: 2_000, caloriesTarget: 2_000, hasPlan: true },
    recovery: { state: 'ready', status: 'ready', sourceDataAvailable: true },
    checkIn: { state: 'ready', mood: 'bien' },
    diagnostic: { state: 'error', canGenerate: false },
    coach: { relationStatus: 'not_found' },
    capabilities,
    ...overrides,
  })
}

describe('Home V2 Daily Status', () => {
  it('distinguishes scheduled, completed, rest and training errors', () => {
    expect(resolveDailyTrainingStatus(makeModel({ training: { session, hasProgram: true } }).training)).toBe('scheduled')
    expect(resolveDailyTrainingStatus(makeModel().training)).toBe('completed')
    expect(resolveDailyTrainingStatus(makeModel({ training: { session: { ...session, isRest: true }, hasProgram: true } }).training)).toBe('rest')
    expect(resolveDailyTrainingStatus(makeModel({ training: { state: 'error', hasProgram: true } }).training)).toBe('error')
  })

  it('keeps nutrition consumed and target values separate', () => {
    const nutrition = makeModel({
      nutrition: {
        state: 'ready', caloriesConsumed: 840, caloriesTarget: 2_100,
        macrosConsumed: { protein: 60, carbs: 90, fat: 24 },
        macrosTarget: { protein: 150, carbs: 230, fat: 70 }, hasPlan: true,
      },
    }).nutrition
    expect(nutrition.caloriesConsumed).toBe(840)
    expect(nutrition.caloriesTarget).toBe(2_100)
    expect(nutrition.macrosConsumed.protein).toBe(60)
    expect(nutrition.macrosTarget.protein).toBe(150)
  })

  it('does not represent a nutrition error as zero', () => {
    const nutrition = makeModel({
      nutrition: { caloriesConsumed: 0, caloriesTarget: 2_100, hasPlan: true },
      errors: { nutrition: 'HOME_NUTRITION_READ_FAILED' },
    }).nutrition
    expect(nutrition.state).toBe('error')
    expect(nutrition.caloriesConsumed).toBeNull()
  })

  it('distinguishes ready recovery from an error', () => {
    expect(resolveDailyRecoveryStatus(makeModel().recovery)).toBe('ready')
    expect(resolveDailyRecoveryStatus(makeModel({ recovery: { state: 'error' } }).recovery)).toBe('error')
  })
})

describe('resolveNextBestAction', () => {
  it('prioritizes a scheduled workout', () => {
    const model = makeModel({ training: { session, hasProgram: true }, checkIn: { state: 'empty' } })
    expect(resolveNextBestAction(model)).toMatchObject({ type: 'start_training', priority: 2 })
  })

  it('then recommends the missing check-in', () => {
    expect(resolveNextBestAction(makeModel({ checkIn: { state: 'empty' } }))).toMatchObject({ type: 'complete_check_in', priority: 3 })
  })

  it('recommends nutrition only from known model data', () => {
    const model = makeModel({ nutrition: { state: 'ready', caloriesConsumed: 800, caloriesTarget: 2_000, hasPlan: true } })
    expect(resolveNextBestAction(model)).toMatchObject({ type: 'open_nutrition', priority: 4 })
  })

  it('recommends an available diagnostic', () => {
    const model = makeModel({ diagnostic: { state: 'ready', latest: { id: 'd1' } } })
    expect(resolveNextBestAction(model)).toMatchObject({ type: 'open_diagnostic', priority: 5 })
  })

  it('handles rest, no program and the stable fallback', () => {
    const rest = makeModel({ training: { session: { ...session, isRest: true }, hasProgram: true } })
    const noProgram = makeModel({ training: { state: 'empty', hasProgram: false } })
    const fallback = makeModel()
    expect(resolveNextBestAction(rest).type).toBe('open_recovery')
    expect(resolveNextBestAction(noProgram).type).toBe('open_program')
    expect(resolveNextBestAction(fallback).type).toBe('view_progress')
    expect(resolveNextBestAction(fallback)).toEqual(resolveNextBestAction(fallback))
  })
})

describe('Wave 1D architecture guards', () => {
  const dailyStatus = readFileSync('app/components/home-v2/DailyStatus.tsx', 'utf8')
  const actionCard = readFileSync('app/components/home-v2/NextBestActionCard.tsx', 'utf8')
  const selector = readFileSync('lib/home/next-best-action.ts', 'utf8')
  const sources = `${dailyStatus}\n${actionCard}\n${selector}`

  it('keeps visual components free of Supabase and local capability resolution', () => {
    expect(sources).not.toMatch(/supabase|resolveUserCapabilities|getActiveCoach|coach_clients/i)
  })

  it('keeps the selector pure and free of AI/network calls', () => {
    expect(selector).not.toMatch(/fetch\(|axios|anthropic|openai|\.from\(|\.insert\(|\.update\(/i)
  })
})
