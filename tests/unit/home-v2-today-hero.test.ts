import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getTodayHeroState } from '@/app/components/home-v2/TodayHero'
import type { HomeViewModel } from '@/lib/home/home-dashboard-model'

const session = {
  id: 'training-1', title: 'Upper body', exercises: [{ name: 'Press' }],
  scheduledAt: null, isRest: false,
}

function training(overrides: Partial<HomeViewModel['training']> = {}): HomeViewModel['training'] {
  return {
    state: 'ready', dayStatus: 'scheduled', session, source: 'custom_program',
    hasProgram: true, isCompleted: false, nextSession: null,
    weeklySummary: { planned: 3, completed: 1, adherence: 1 / 3 },
    ...overrides,
  }
}

describe('Home V2 Today Hero states', () => {
  it.each([
    ['scheduled', training()],
    ['completed', training({ dayStatus: 'completed', isCompleted: true })],
    ['rest', training({ dayStatus: 'rest', session: { ...session, isRest: true } })],
    ['empty', training({ state: 'empty', dayStatus: 'no_session', session: null })],
    ['loading', training({ state: 'loading', dayStatus: 'no_session', session: null })],
    ['error', training({ state: 'error', dayStatus: 'no_session', session: null })],
  ] as const)('maps the %s state without reinterpretation', (expected, value) => {
    expect(getTodayHeroState(value)).toBe(expected)
  })

  it('never converts an error into the empty state', () => {
    expect(getTodayHeroState(training({ state: 'error', dayStatus: 'no_session', session: null }))).not.toBe('empty')
  })
})

describe('Home V2 architecture guards', () => {
  const hero = readFileSync('app/components/home-v2/TodayHero.tsx', 'utf8')
  const header = readFileSync('app/components/home-v2/HomeV2Header.tsx', 'utf8')
  const home = readFileSync('app/components/home-v2/HomeV2.tsx', 'utf8')
  const page = readFileSync('app/(application)/page.tsx', 'utf8')

  it('keeps the visual component independent from repositories and Supabase', () => {
    expect(hero).not.toMatch(/supabase|scheduled_sessions|custom_programs|client_programs|workout_sessions/i)
    expect(hero).not.toMatch(/resolveUserCapabilities|coach relation|active-relation-repository/i)
  })

  it('takes training only from the HomeViewModel contract', () => {
    expect(hero).toContain("training: HomeViewModel['training']")
    expect(home).toContain('training={model.training}')
  })

  it('sources the displayed date from HomeViewModel.today', () => {
    expect(header).toContain("Pick<HomeViewModel, 'identity' | 'today'>")
    expect(header).toContain('today.localDateKey')
  })

  it('uses one shared Home V2 entry and no competing desktop dashboard', () => {
    expect(page).toContain('homeModel={homeModel}')
    expect(page).not.toContain("import DesktopDashboard")
    expect(page).not.toMatch(/coachManaged.*homeModel|homeModel.*coachManaged/)
  })
})
