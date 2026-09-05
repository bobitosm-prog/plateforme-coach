import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  hasActiveHomeCoach,
  toCoachAppointmentView,
  toCoachMessageView,
} from '@/app/components/home-v2/ActiveCoachCard'
import { resolveAthenaHomeInsight } from '@/lib/home/athena-home-insight'
import { buildHomeViewModel, type HomeViewModelInput } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'

const capabilities = { ai: true, training: true, nutrition: true, coachManaged: false }
const session = { id: 's1', title: 'Full body', exercises: [], scheduledAt: null, isRest: false }

function makeModel(overrides: Partial<HomeViewModelInput> = {}) {
  return buildHomeViewModel({
    today: getHomeDayWindow(new Date('2026-08-25T10:00:00Z')),
    identity: { firstName: 'Marco' },
    training: { state: 'empty', hasProgram: true },
    nutrition: { state: 'ready', caloriesConsumed: 2_000, caloriesTarget: 2_000 },
    recovery: { state: 'empty', sourceDataAvailable: false },
    checkIn: { state: 'ready', mood: 'bien' },
    progression: { state: 'empty' },
    diagnostic: { state: 'empty', canGenerate: false },
    coach: { relationStatus: 'not_found' },
    capabilities,
    ...overrides,
  })
}

describe('Athena Home insight resolver', () => {
  it('uses scheduled training and reliable recovery data first', () => {
    const model = makeModel({
      training: { session, source: 'custom_program', hasProgram: true },
      recovery: { state: 'ready', status: 'ready', sourceDataAvailable: true },
    })
    expect(resolveAthenaHomeInsight(model)).toMatchObject({ reason: 'training_recovery_ready', priority: 1 })
  })

  it('returns a cautious warning for watch or recover states', () => {
    const model = makeModel({
      training: { session, source: 'custom_program', hasProgram: true },
      recovery: { state: 'ready', status: 'watch', sourceDataAvailable: true },
    })
    expect(resolveAthenaHomeInsight(model).reason).toBe('training_recovery_warning')
  })

  it('handles rest, reliable nutrition incompleteness and a missing check-in in priority order', () => {
    const rest = makeModel({ training: { session: { ...session, isRest: true }, hasProgram: true } })
    const nutrition = makeModel({ nutrition: { state: 'ready', caloriesConsumed: 500, caloriesTarget: 2_000 } })
    const checkIn = makeModel({ checkIn: { state: 'empty' } })
    expect(resolveAthenaHomeInsight(rest).reason).toBe('rest_day')
    expect(resolveAthenaHomeInsight(nutrition).reason).toBe('nutrition_incomplete')
    expect(resolveAthenaHomeInsight(checkIn).reason).toBe('check_in_missing')
  })

  it('uses progression and then a generic fallback without inventing data', () => {
    const progression = makeModel({ progression: { currentWeight: 80 } })
    expect(resolveAthenaHomeInsight(progression).reason).toBe('progression_available')
    expect(resolveAthenaHomeInsight(makeModel()).reason).toBe('generic_fallback')
  })

  it('is deterministic and separates loading from a safe error fallback', () => {
    const model = makeModel({ training: { state: 'loading', hasProgram: true } })
    expect(resolveAthenaHomeInsight(model)).toEqual(resolveAthenaHomeInsight(model))
    expect(resolveAthenaHomeInsight(model).type).toBe('loading')
    expect(resolveAthenaHomeInsight(makeModel({ errors: { recovery: 'READ_FAILED' } }))).toMatchObject({
      type: 'fallback', reason: 'safe_fallback',
    })
  })
})

describe('Active coach authority and optional details', () => {
  const activeCoach = makeModel({
    coach: {
      relationStatus: 'active', coachId: '2af8f408-80df-4ec0-ae13-4c942d24d1c4',
      coachDisplayName: 'Sophie',
    },
  }).coach

  it('shows a coach only for an active relation with a coach id', () => {
    expect(hasActiveHomeCoach(activeCoach)).toBe(true)
    expect(hasActiveHomeCoach(makeModel({ coach: { relationStatus: 'active' } }).coach)).toBe(false)
    expect(hasActiveHomeCoach(makeModel({ coach: { relationStatus: 'ended', coachId: 'coach' } }).coach)).toBe(false)
    expect(hasActiveHomeCoach(makeModel({ coach: { relationStatus: 'not_found' } }).coach)).toBe(false)
    expect(hasActiveHomeCoach(makeModel({ coach: { relationStatus: 'multiple_active', coachId: 'coach' } }).coach)).toBe(false)
    expect(hasActiveHomeCoach(makeModel({ coach: { relationStatus: 'error', coachId: 'coach' } }).coach)).toBe(false)
    expect(hasActiveHomeCoach(makeModel({
      coach: { relationStatus: 'active', coachId: 'coach' }, errors: { coach: 'READ_FAILED' },
    }).coach)).toBe(false)
  })

  it('does not accept coachManaged capability as relation proof', () => {
    const model = makeModel({ capabilities: { ...capabilities, coachManaged: true } })
    expect(hasActiveHomeCoach(model.coach)).toBe(false)
  })

  it('does not fabricate unavailable messages or appointments', () => {
    expect(toCoachMessageView('unavailable')).toBeNull()
    expect(toCoachMessageView(null)).toBeNull()
    expect(toCoachAppointmentView(null)).toBeNull()
    expect(toCoachAppointmentView({ scheduled_at: 'not-a-date' })).toBeNull()
    expect(toCoachAppointmentView({ scheduled_at: '2026-08-26T09:42:00Z', location: 'Studio' })).toEqual({
      scheduledAt: '2026-08-26T09:42:00Z', location: 'Studio',
    })
  })
})

describe('Wave 1F architecture and claim guards', () => {
  const resolver = readFileSync('lib/home/athena-home-insight.ts', 'utf8')
  const athenaCard = readFileSync('app/components/home-v2/AthenaInsightCard.tsx', 'utf8')
  const coachCard = readFileSync('app/components/home-v2/ActiveCoachCard.tsx', 'utf8')
  const home = readFileSync('app/components/home-v2/HomeV2.tsx', 'utf8')
  const legacyHome = readFileSync('app/components/tabs/HomeTab.tsx', 'utf8')

  it('keeps the resolver deterministic and free of network, DB, LLM and mutation calls', () => {
    expect(resolver).not.toMatch(/fetch\(|axios|supabase|\.from\(|anthropic|openai|ChatAI|Date\.now|Math\.random|\.insert\(|\.update\(/i)
  })

  it('keeps both visual components free of data and authority repositories', () => {
    expect(`${athenaCard}\n${coachCard}`).not.toMatch(/supabase|\.from\(|findActiveCoach|coach_clients|resolveUserCapabilities/i)
  })

  it('integrates Athena then coach after progression and removes the duplicate appointment read', () => {
    expect(home.indexOf('<AthenaInsightCard')).toBeGreaterThan(home.indexOf('<ProgressionSnapshot'))
    expect(home.indexOf('<ActiveCoachCard')).toBeGreaterThan(home.indexOf('<AthenaInsightCard'))
    expect(legacyHome).not.toContain("supabase.from('coach_appointments')")
  })

  it('contains no unsafe medical, injury-prevention or guaranteed-result claims', () => {
    const messages = ['fr', 'en', 'de'].map(locale => {
      const json = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
      return JSON.stringify(json.home.v2.athenaInsight.messages)
    }).join('\n')
    expect(messages).not.toMatch(/diagnostic médical|medical diagnosis|verletzungs|blessure|injury|thérapeut|therapeut|garanti|guarantee|24\/7|athena sait|athena knows|athena weiß/i)
  })
})
