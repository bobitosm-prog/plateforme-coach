import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveProgressionSnapshotState,
  resolveWeightTrendDirection,
} from '@/app/components/home-v2/ProgressionSnapshot'
import {
  buildHomeViewModel,
  normalizeHomeProgressionRecord,
  type HomeViewModelInput,
} from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const capabilities = { ai: true, training: true, nutrition: true, coachManaged: false }

function progressionModel(progression: HomeViewModelInput['progression']) {
  return buildHomeViewModel({
    today: getHomeDayWindow(new Date('2026-08-24T12:00:00Z')),
    identity: { firstName: 'Marco' },
    training: { state: 'empty' },
    nutrition: { state: 'empty' },
    progression,
    coach: { relationStatus: 'not_found' },
    capabilities,
  }).progression
}

describe('Home V2 progression snapshot', () => {
  it('distinguishes complete, partial, empty, loading and error states', () => {
    expect(resolveProgressionSnapshotState(progressionModel({
      currentWeight: 80,
      sessionsThisWeek: 3,
      adherence: 0.75,
    }))).toBe('complete')
    expect(resolveProgressionSnapshotState(progressionModel({ currentWeight: 80 }))).toBe('partial')
    expect(resolveProgressionSnapshotState(progressionModel({ state: 'empty' }))).toBe('empty')
    expect(resolveProgressionSnapshotState(progressionModel({ state: 'loading' }))).toBe('loading')
    expect(resolveProgressionSnapshotState(progressionModel({ state: 'error' }))).toBe('error')
  })

  it('keeps weight trend neutral and preserves missing comparison data', () => {
    expect(resolveWeightTrendDirection(0.4)).toBe('up')
    expect(resolveWeightTrendDirection(-0.4)).toBe('down')
    expect(resolveWeightTrendDirection(0)).toBe('stable')
    expect(resolveWeightTrendDirection(null)).toBe('unknown')
    expect(progressionModel({ currentWeight: 80 }).weightTrend).toBeNull()
  })

  it('normalizes only a real personal record from the loaded dashboard data', () => {
    expect(normalizeHomeProgressionRecord({
      exercise_name: 'Développé couché', value: 105, previous_value: 100,
      unit: 'kg', achieved_at: '2026-08-23',
    })).toEqual({
      exerciseName: 'Développé couché', value: 105, previousValue: 100,
      unit: 'kg', achievedAt: '2026-08-23',
    })
    expect(normalizeHomeProgressionRecord({ value: 105 })).toBeNull()
  })

  it('preserves weekly sessions, reliable adherence and an optional latest PR', () => {
    const withRecord = progressionModel({
      sessionsThisWeek: 3,
      adherence: 0.75,
      latestPR: { exercise_name: 'Squat', value: 140, unit: 'kg' },
    })
    expect(withRecord.sessionsThisWeek).toBe(3)
    expect(withRecord.adherence).toBe(0.75)
    expect(withRecord.latestPR?.exerciseName).toBe('Squat')

    const partial = progressionModel({ sessionsThisWeek: 2 })
    expect(partial.adherence).toBeNull()
    expect(partial.latestPR).toBeNull()
    expect(resolveProgressionSnapshotState(partial)).toBe('partial')
  })

  it('does not turn a progression error into a collection of zero values', () => {
    const progression = progressionModel({
      currentWeight: 0,
      sessionsThisWeek: 0,
      adherence: 0,
      state: 'error',
    })
    expect(resolveProgressionSnapshotState(progression)).toBe('error')
  })
})

describe('Wave 1E architecture guards', () => {
  const snapshot = readFileSync('app/components/home-v2/ProgressionSnapshot.tsx', 'utf8')
  const homeV2 = readFileSync('app/components/home-v2/HomeV2.tsx', 'utf8')
  const homeTab = readFileSync('app/components/tabs/HomeTab.tsx', 'utf8')
  const css = readFileSync('app/components/home-v2/HomeV2.module.css', 'utf8')

  it('keeps the snapshot free of DB, network and capability reads', () => {
    expect(snapshot).not.toMatch(/supabase|\.from\(|fetch\(|axios|resolveUserCapabilities|coach_clients/i)
    expect(snapshot).toContain("progression: HomeViewModel['progression']")
  })

  it('places the snapshot after the next best action and removes the legacy duplicate', () => {
    expect(homeV2.indexOf('<ProgressionSnapshot')).toBeGreaterThan(homeV2.indexOf('<NextBestActionCard'))
    expect(homeTab).not.toContain('PROGRESSION (streak + weight + XP)')
    expect(homeTab).not.toContain('barData.map')
  })

  it('keeps one Progression CTA and responsive layouts', () => {
    expect(snapshot).toContain('onOpenProgression')
    expect(css).toContain('.progressionGrid')
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.progressionGrid/)
  })

  it('provides the snapshot copy in French, English and German', () => {
    for (const locale of ['fr', 'en', 'de']) {
      const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
      expect(messages.home.v2.progression.title).toBeTruthy()
      expect(messages.home.v2.progression.emptyTitle).toBeTruthy()
      expect(messages.home.v2.progression.errorTitle).toBeTruthy()
      expect(messages.home.v2.progression.cta).toBeTruthy()
    }
  })
})
