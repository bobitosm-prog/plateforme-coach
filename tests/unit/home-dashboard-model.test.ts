import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildHomeViewModel,
  resolveHomeTrainingData,
  type HomeViewModelInput,
} from '@/lib/home/home-dashboard-model'
import {
  getHomeDayWindow,
  getHomeNutritionDayKey,
  isInHomeDay,
} from '@/lib/home/home-date'

const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}
const coachManaged = {
  ai: false,
  training: false,
  nutrition: false,
  coachManaged: true,
}

function input(overrides: Partial<HomeViewModelInput> = {}): HomeViewModelInput {
  return {
    today: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
    identity: { firstName: 'Marco', xp: 120, streak: 4 },
    training: { state: 'empty' },
    nutrition: {
      state: 'ready',
      caloriesConsumed: 820,
      caloriesTarget: 2_100,
      macrosConsumed: { protein: 62, carbs: 91, fat: 24 },
      macrosTarget: { protein: 150, carbs: 230, fat: 70 },
      hasPlan: true,
    },
    coach: { relationStatus: 'not_found' },
    capabilities: unrestricted,
    ...overrides,
  }
}

describe('Home Zurich day', () => {
  it('moves to the next local day at the Zurich midnight boundary', () => {
    const before = getHomeDayWindow(new Date('2026-08-24T21:59:59.000Z'))
    const after = getHomeDayWindow(new Date('2026-08-24T22:00:01.000Z'))

    expect(before.localDateKey).toBe('2026-08-24')
    expect(after.localDateKey).toBe('2026-08-25')
    expect(after.timezone).toBe('Europe/Zurich')
    expect(getHomeNutritionDayKey(before)).toBe('lundi')
    expect(getHomeNutritionDayKey(after)).toBe('mardi')
  })

  it('uses DST-safe half-open boundaries', () => {
    const summer = getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z'))
    const winter = getHomeDayWindow(new Date('2026-12-24T12:00:00.000Z'))

    expect(summer.todayStart.toISOString()).toBe('2026-08-23T22:00:00.000Z')
    expect(summer.todayEnd.toISOString()).toBe('2026-08-24T22:00:00.000Z')
    expect(winter.todayStart.toISOString()).toBe('2026-12-23T23:00:00.000Z')
    expect(winter.todayEnd.toISOString()).toBe('2026-12-24T23:00:00.000Z')
    expect(isInHomeDay(summer.todayStart, summer)).toBe(true)
    expect(isInHomeDay(summer.todayEnd, summer)).toBe(false)
  })
})

describe('Home training model', () => {
  const workout = {
    id: 'session-1',
    title: 'Push',
    exercises: [{ name: 'Bench press' }],
    scheduledAt: '2026-08-24T16:00:00.000Z',
    isRest: false,
  }

  it('represents a scheduled session', () => {
    const model = buildHomeViewModel(input({
      training: {
        session: workout,
        source: 'scheduled',
        weeklyPlanned: 4,
        weeklyCompleted: 2,
      },
    }))

    expect(model.training.state).toBe('ready')
    expect(model.training.dayStatus).toBe('scheduled')
    expect(model.training.source).toBe('scheduled')
    expect(model.training.weeklySummary.adherence).toBe(0.5)
  })

  it('distinguishes completed, rest and no-session states', () => {
    const completed = buildHomeViewModel(input({
      training: { session: workout, source: 'coach_program', isCompleted: true },
    }))
    const rest = buildHomeViewModel(input({
      training: {
        session: { ...workout, id: null, title: 'Repos', exercises: [], isRest: true },
        source: 'custom_program',
      },
    }))
    const empty = buildHomeViewModel(input({ training: { state: 'empty' } }))

    expect(completed.training.dayStatus).toBe('completed')
    expect(rest.training.dayStatus).toBe('rest')
    expect(empty.training.dayStatus).toBe('no_session')
    expect(empty.training.session).toBeNull()
  })

  it('selects scheduled timing, program exercises and Zurich completion data', () => {
    const day = getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z'))
    const training = resolveHomeTrainingData({
      day,
      scheduledSessions: [{
        id: 'scheduled-1',
        title: 'Push planifié',
        scheduled_date: '2026-08-24',
        scheduled_time: '18:00:00',
      }],
      programSession: {
        title: 'Push programme',
        exercises: [{ name: 'Bench press' }],
        source: 'custom_program',
      },
      workoutSessions: [{
        id: 'done-1',
        name: 'Séance matinale',
        created_at: '2026-08-23T22:30:00.000Z',
        completed: true,
      }],
    })

    expect(training.source).toBe('scheduled')
    expect(training.session?.title).toBe('Push planifié')
    expect(training.session?.exercises).toHaveLength(1)
    expect(training.isCompleted).toBe(true)
  })

  it('keeps an explicit rest day when no scheduled workout overrides it', () => {
    const training = resolveHomeTrainingData({
      day: getHomeDayWindow(new Date('2026-08-24T12:00:00.000Z')),
      scheduledSessions: [],
      programSession: {
        title: 'Repos',
        exercises: [],
        isRest: true,
        source: 'coach_program',
      },
      workoutSessions: [],
    })

    expect(training.session?.isRest).toBe(true)
    expect(training.source).toBe('coach_program')
  })

  it('keeps Home reads free of planning writes', () => {
    const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')

    expect(hook).not.toMatch(/useScheduledSessions|regenerateWeekSchedule|gap-fill/i)
    expect(hook).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/)
  })
})

describe('Home nutrition and partial failures', () => {
  it('keeps consumed macros distinct from targets', () => {
    const model = buildHomeViewModel(input())

    expect(model.nutrition.caloriesConsumed).toBe(820)
    expect(model.nutrition.caloriesTarget).toBe(2_100)
    expect(model.nutrition.macrosConsumed.protein).toBe(62)
    expect(model.nutrition.macrosTarget.protein).toBe(150)
  })

  it('represents absence as empty', () => {
    const model = buildHomeViewModel(input({
      nutrition: {
        state: 'empty',
        caloriesConsumed: null,
        caloriesTarget: 2_100,
        hasPlan: false,
      },
    }))

    expect(model.nutrition.state).toBe('empty')
    expect(model.nutrition.caloriesConsumed).toBeNull()
  })

  it('does not turn a nutrition read error into zero', () => {
    const model = buildHomeViewModel(input({
      errors: { nutrition: 'HOME_NUTRITION_READ_FAILED' },
      nutrition: {
        caloriesConsumed: 0,
        caloriesTarget: 2_100,
        hasPlan: true,
      },
    }))

    expect(model.nutrition.state).toBe('error')
    expect(model.nutrition.caloriesConsumed).toBeNull()
    expect(model.errors.nutrition?.code).toBe('HOME_NUTRITION_READ_FAILED')
  })
})

describe('Home coach relation', () => {
  it('exposes a verified active relation', () => {
    const model = buildHomeViewModel(input({
      coach: {
        relationStatus: 'active',
        coachId: 'coach-1',
        coachDisplayName: 'Sophie',
      },
    }))

    expect(model.coach.state).toBe('ready')
    expect(model.coach.coachId).toBe('coach-1')
    expect(model.coach.coachDisplayName).toBe('Sophie')
  })

  it.each(['ended', 'not_found'] as const)(
    'keeps %s relation inactive',
    relationStatus => {
      const model = buildHomeViewModel(input({
        coach: { relationStatus, coachId: 'stale-coach' },
      }))

      expect(model.coach.state).toBe('empty')
      expect(model.coach.coachId).toBeNull()
    },
  )

  it.each(['multiple_active', 'error'] as const)(
    'fails safe for %s',
    relationStatus => {
      const model = buildHomeViewModel(input({
        coach: { relationStatus, coachId: 'unsafe-coach' },
      }))

      expect(model.coach.state).toBe('error')
      expect(model.coach.coachId).toBeNull()
    },
  )

  it('does not treat coachManaged capability as an active relation', () => {
    const model = buildHomeViewModel(input({
      capabilities: coachManaged,
      coach: { relationStatus: 'not_found' },
    }))

    expect(model.capabilities.coachManaged).toBe(true)
    expect(model.coach.state).toBe('empty')
    expect(model.coach.coachId).toBeNull()
  })
})

describe('Home general states', () => {
  it('exposes global and per-domain loading', () => {
    const model = buildHomeViewModel(input({
      identity: { firstName: '', state: 'loading' },
      training: { state: 'loading' },
    }))

    expect(model.loading.global).toBe(true)
    expect(model.loading.domains.identity).toBe(true)
    expect(model.loading.domains.training).toBe(true)
  })

  it('keeps one domain error isolated from ready domains', () => {
    const model = buildHomeViewModel(input({
      errors: { checkIn: 'HOME_CHECKIN_READ_FAILED' },
      checkIn: { state: 'error' },
    }))

    expect(model.checkIn.state).toBe('error')
    expect(model.nutrition.state).toBe('ready')
    expect(model.loading.global).toBe(false)
  })

  it('guards the architectural boundaries statically', () => {
    const model = readFileSync('lib/home/home-dashboard-model.ts', 'utf8')
    const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')

    expect(model).not.toMatch(/subscription_type|aiAllowed/)
    expect(model).not.toMatch(/coach_clients/)
    expect(hook).not.toMatch(/coach_clients/)
    expect(hook).not.toMatch(/resolveUserCapabilities|resolveEffectiveEntitlement/)
    expect(hook).not.toMatch(/\/api\//)
  })
})
