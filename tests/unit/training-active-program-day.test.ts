import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  navigateTrainingWeek,
  resolveActiveProgramDay,
  selectActivePersonalProgram,
  selectTrainingDay,
} from '../../lib/training/active-program-day'

afterEach(() => vi.useRealTimers())

describe('active Training program resolution', () => {
  it('selects the first active personal program without mutating the list', () => {
    const programs = Object.freeze([
      Object.freeze({ id: 'inactive', is_active: false }),
      Object.freeze({ id: 'active-first', is_active: true }),
      Object.freeze({ id: 'active-second', is_active: true }),
    ])

    expect(selectActivePersonalProgram(programs)).toEqual({ id: 'active-first', is_active: true })
    expect(programs.map(program => program.id)).toEqual(['inactive', 'active-first', 'active-second'])
  })

  it('preserves personal program priority over an assigned coach program', () => {
    const personalExercise = { exercise_name: 'Squat personnel', sets: 4, reps: 8 }
    const coachExercise = { name: 'Squat coach', sets: 3, reps: 10 }

    const result = resolveActiveProgramDay({
      activePersonalProgram: { days: [{ name: 'Personnel', exercises: [personalExercise] }] },
      coachProgram: { lundi: { exercises: [coachExercise] } },
      trainingDay: 'lundi',
    })

    expect(result.source).toBe('personal')
    expect(result.day).toMatchObject({ repos: false })
    expect(result.exercises).toEqual([expect.objectContaining({ name: 'Squat personnel', sets: 4, reps: 8 })])
  })

  it('keeps explicit and padded personal rest days', () => {
    const explicit = resolveActiveProgramDay({
      activePersonalProgram: { days: [{ is_rest: true, exercises: [] }] },
      coachProgram: { lundi: { exercises: [{ name: 'Coach' }] } },
      trainingDay: 'lundi',
    })
    const padded = resolveActiveProgramDay({
      activePersonalProgram: { days: [{ name: 'Lundi', exercises: [{ name: 'Squat' }] }] },
      coachProgram: { dimanche: { exercises: [{ name: 'Coach' }] } },
      trainingDay: 'dimanche',
    })

    expect(explicit).toMatchObject({ source: 'personal', day: { repos: true }, exercises: [] })
    expect(padded).toMatchObject({ source: 'personal', day: { repos: true }, exercises: [] })
  })

  it('preserves the coach fallback for missing, empty, or uninterpretable personal data', () => {
    const coachDay = { name: 'Coach', exercises: [{ name: 'Row' }] }
    for (const activePersonalProgram of [null, { days: [] }, { days: [{}] }]) {
      const result = resolveActiveProgramDay({
        activePersonalProgram,
        coachProgram: { legacyDay: coachDay },
        trainingDay: 'legacyDay',
      })
      expect(result).toEqual({ source: 'coach', day: coachDay, exercises: coachDay.exercises })
    }
  })

  it('keeps the legacy empty coach day and no-program states distinct', () => {
    expect(resolveActiveProgramDay({
      activePersonalProgram: null,
      coachProgram: {},
      trainingDay: 'mardi',
    })).toEqual({ source: 'coach', day: { repos: false, exercises: [] }, exercises: [] })

    expect(resolveActiveProgramDay({
      activePersonalProgram: null,
      coachProgram: null,
      trainingDay: 'mardi',
    })).toEqual({ source: 'none', day: null, exercises: [] })
  })

  it('resolves periodized prescriptions for the effective week without mutating legacy data', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T12:00:00Z'))
    const exercise = Object.freeze({
      exercise_name: 'Développé couché', sets: 3, reps: 12, rest_seconds: 60,
      phases: Object.freeze({
        p1: Object.freeze({ sets: 4, reps: '10', rest_seconds: 75 }),
        p2: Object.freeze({ sets: 5, reps: '8-10', rest_seconds: 90 }),
      }),
    })

    const result = resolveActiveProgramDay({
      activePersonalProgram: { start_date: '2026-06-13', total_weeks: 12, days: [{ exercises: [exercise] }] },
      coachProgram: null,
      trainingDay: 'lundi',
    })

    expect(result.exercises[0]).toMatchObject({ sets: 5, reps: 8, rest_seconds: 90 })
    expect(exercise).toMatchObject({ sets: 3, reps: 12, rest_seconds: 60 })
  })
})

describe('Training day navigation', () => {
  it('maps the stable Monday-first day order and rejects invalid indexes', () => {
    expect(Array.from({ length: 7 }, (_, index) => selectTrainingDay(index))).toEqual([
      'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
    ])
    expect(selectTrainingDay(-1)).toBeNull()
    expect(selectTrainingDay(7)).toBeNull()
  })

  it('moves deterministically between weeks and returns to today with the current animation direction', () => {
    expect(navigateTrainingWeek(0, 'previous')).toEqual({ offset: -1, direction: -1 })
    expect(navigateTrainingWeek(-1, 'next')).toEqual({ offset: 0, direction: 1 })
    expect(navigateTrainingWeek(3, 'today')).toEqual({ offset: 0, direction: -1 })
    expect(navigateTrainingWeek(-2, 'today')).toEqual({ offset: 0, direction: 1 })
    expect(navigateTrainingWeek(0, 'today')).toEqual({ offset: 0, direction: 1 })
  })
})
