import { describe, expect, it } from 'vitest'

import { buildRecoveryModel, type RecoveryWorkoutSession } from '@/lib/home/recovery-model'

const now = new Date('2026-09-12T12:00:00.000Z')
const exercises = [
  { id: 'bench', muscle_group: 'Pectoraux' },
  { id: 'row', muscle_group: 'Dos' },
  { id: 'squat', muscle_group: 'Quadriceps' },
]

function session(overrides: Partial<RecoveryWorkoutSession> = {}): RecoveryWorkoutSession {
  return {
    completed: true,
    created_at: '2026-09-11T12:00:00.000Z',
    workout_sets: [{ completed: true, exercise_id: 'bench', exercise_name: 'Bench press', rir: 2 }],
    ...overrides,
  }
}

function sets(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, () => ({
    completed: true,
    exercise_id: 'bench',
    exercise_name: 'Bench press',
    rir: 2,
    ...overrides,
  }))
}

describe('Home recovery model', () => {
  it('ignores incomplete sessions and keeps completed sessions', () => {
    const model = buildRecoveryModel({
      sessions: [session({ completed: false }), session()],
      exercises,
      now,
    })

    expect(model.zones).toHaveLength(1)
    expect(model.zones[0].zone).toBe('chest')
  })

  it('ignores incomplete sets', () => {
    const model = buildRecoveryModel({
      sessions: [session({ workout_sets: [
        { completed: false, exercise_id: 'row', exercise_name: 'Row', rir: 2 },
        { completed: true, exercise_id: 'bench', exercise_name: 'Bench press', rir: 2 },
      ] })],
      exercises,
      now,
    })

    expect(model.zones.map(zone => zone.zone)).toEqual(['chest'])
    expect(model.zones[0].setCount).toBe(1)
  })

  it.each([
    [4, 24, 36],
    [5, 36, 48],
    [9, 48, 72],
  ])('uses the expected recovery window for %i completed sets', (count, minHours, maxHours) => {
    const model = buildRecoveryModel({ sessions: [session({ workout_sets: sets(count) })], exercises, now })

    expect(model.zones[0].window).toEqual({ minHours, maxHours })
  })

  it('keeps RIR zero in the median and treats median RIR <= 1 prudently', () => {
    const model = buildRecoveryModel({
      sessions: [session({
        created_at: '2026-09-11T06:00:00.000Z',
        workout_sets: [
          ...sets(2, { rir: 0 }),
          ...sets(2, { rir: 1 }),
        ],
      })],
      exercises,
      now,
    })

    expect(model.zones[0].medianRir).toBe(0.5)
    expect(model.zones[0].status).toBe('recovering')
  })

  it('keeps RIR 2 in recovering between the window bounds', () => {
    const model = buildRecoveryModel({
      sessions: [session({ created_at: '2026-09-11T06:00:00.000Z', workout_sets: sets(2, { rir: 2 }) })],
      exercises,
      now,
    })

    expect(model.zones[0]).toMatchObject({ status: 'recovering', window: { minHours: 24, maxHours: 36 } })
  })

  it.each([
    ['2026-09-11T12:00:00.000Z', 'recovering'],
    ['2026-09-11T00:00:00.000Z', 'probably_ready'],
  ] as const)('applies the inclusive boundary contract at %s', (createdAt, expectedStatus) => {
    const model = buildRecoveryModel({
      sessions: [session({ created_at: createdAt, workout_sets: sets(2, { rir: 2 }) })],
      exercises,
      now,
    })

    expect(model.zones[0].status).toBe(expectedStatus)
  })

  it('reduces confidence when RIR is absent', () => {
    const model = buildRecoveryModel({
      sessions: [session({ created_at: '2026-09-11T06:00:00.000Z', workout_sets: sets(2, { rir: null }) })],
      exercises,
      now,
    })

    expect(model.zones[0].confidence).toBe('reduced')
    expect(model.zones[0].status).toBe('recovering')
  })

  it('uses the most recent solicitation when several sessions target one zone', () => {
    const model = buildRecoveryModel({
      sessions: [
        session({ created_at: '2026-09-09T12:00:00.000Z', workout_sets: sets(9) }),
        session({ created_at: '2026-09-12T06:00:00.000Z', workout_sets: sets(2) }),
      ],
      exercises,
      now,
    })

    expect(model.zones[0].setCount).toBe(2)
    expect(model.zones[0].elapsedHours).toBe(6)
    expect(model.zones[0].status).toBe('leave_alone')
  })

  it('ignores an unknown exercise id when no fallback exists', () => {
    const model = buildRecoveryModel({
      sessions: [session({ workout_sets: sets(2, { exercise_id: 'unknown' }) })],
      exercises,
      now,
    })

    expect(model).toMatchObject({ status: 'unknown', zones: [] })
  })

  it('uses muscles_worked only when exercise metadata cannot resolve the session', () => {
    const model = buildRecoveryModel({
      sessions: [session({
        muscles_worked: ['Dos'],
        workout_sets: sets(2, { exercise_id: 'unknown' }),
      })],
      exercises,
      now,
    })

    expect(model.zones[0]).toMatchObject({
      zone: 'back',
      source: 'session_fallback',
      confidence: 'reduced',
      setCount: 0,
      window: { minHours: 36, maxHours: 48 },
    })
  })

  it('completes resolved metadata zones with uncovered muscles_worked zones', () => {
    const model = buildRecoveryModel({
      sessions: [session({
        muscles_worked: ['Pectoraux', 'Dos'],
        workout_sets: [
          { completed: true, exercise_id: 'bench', exercise_name: 'Bench press', rir: 2 },
          { completed: true, exercise_id: 'unknown', exercise_name: 'Unknown row', rir: 2 },
        ],
      })],
      exercises,
      now,
    })

    expect(model.zones.map(zone => zone.zone)).toEqual(['chest', 'back'])
    expect(model.zones.find(zone => zone.zone === 'chest')).toMatchObject({ source: 'exercise_metadata', confidence: 'high' })
    expect(model.zones.find(zone => zone.zone === 'back')).toMatchObject({ source: 'session_fallback', confidence: 'reduced' })
  })

  it('clamps a future timestamp and reduces confidence', () => {
    const model = buildRecoveryModel({
      sessions: [session({ created_at: '2026-09-13T12:00:00.000Z' })],
      exercises,
      now,
    })

    expect(model.zones[0]).toMatchObject({ elapsedHours: 0, confidence: 'reduced', status: 'leave_alone' })
  })

  it('ignores sessions older than seven days and invalid session timestamps', () => {
    const model = buildRecoveryModel({
      sessions: [
        session({ created_at: '2026-09-05T11:59:59.000Z' }),
        session({ created_at: 'invalid' }),
      ],
      exercises,
      now,
    })

    expect(model).toMatchObject({ status: 'unknown', zones: [] })
  })

  it('returns unknown without usable data', () => {
    expect(buildRecoveryModel({ sessions: [], exercises, now })).toMatchObject({ status: 'unknown', zones: [] })
  })

  it('uses the most restrictive known zone instead of averaging', () => {
    const model = buildRecoveryModel({
      sessions: [
        session({ created_at: '2026-09-10T00:00:00.000Z' }),
        session({ created_at: '2026-09-12T06:00:00.000Z', workout_sets: [{ completed: true, exercise_id: 'row', rir: 2 }] }),
      ],
      exercises,
      now,
    })

    expect(model.zones.find(zone => zone.zone === 'chest')?.status).toBe('probably_ready')
    expect(model.zones.find(zone => zone.zone === 'back')?.status).toBe('leave_alone')
    expect(model.status).toBe('leave_alone')
  })

  it('keeps a restrictive heavy session over a newer light session on the same muscle', () => {
    const model = buildRecoveryModel({
      sessions: [
        session({ created_at: '2026-09-10T10:00:00.000Z', workout_sets: sets(9) }),
        session({ created_at: '2026-09-10T23:00:00.000Z', workout_sets: sets(2) }),
      ],
      exercises,
      now,
    })

    expect(model.zones[0]).toMatchObject({
      status: 'recovering',
      setCount: 9,
      lastWorkedAt: '2026-09-10T10:00:00.000Z',
    })
  })
})
