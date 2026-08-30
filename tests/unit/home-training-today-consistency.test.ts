import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveHomeTrainingData } from '@/lib/home/home-dashboard-model'
import { getHomeDayWindow } from '@/lib/home/home-date'
import { deriveTodayTrainingState } from '@/lib/training/today-training-state'

const trainingTab = readFileSync('app/components/tabs/TrainingTab.tsx', 'utf8')
const trainingEmptyState = readFileSync('app/components/training-v2/NoActiveSession.tsx', 'utf8')
const day = getHomeDayWindow(new Date('2026-08-30T22:30:00.000Z'))

const completedWorkout = {
  id: 'workout-today',
  name: 'Séance libre sans titre de programme correspondant',
  created_at: '2026-08-30T22:15:00.000Z',
  completed: true,
}

describe('Home and Training today consistency', () => {
  it('resolves a completed workout in Home and Training before a rest day', () => {
    const shared = deriveTodayTrainingState({
      day,
      plannedSession: { exerciseCount: 0, isRest: true },
      programSource: 'coach',
      workoutSessions: [completedWorkout],
    })
    const home = resolveHomeTrainingData({
      day,
      scheduledSessions: [],
      programSession: { title: 'Repos', exercises: [], isRest: true, source: 'coach_program' },
      workoutSessions: [completedWorkout],
    })

    expect(shared.kind).toBe('completed')
    expect(shared.completedSession?.id).toBe('workout-today')
    expect(home.isCompleted).toBe(true)
    expect(trainingTab).toContain('todayTrainingState.kind')
    expect(trainingEmptyState).toContain("todayState === 'completed'")
    expect(trainingEmptyState).toContain("t('sessionCompletedToday')")
  })

  it('keeps a planned incomplete session planned', () => {
    expect(deriveTodayTrainingState({
      day,
      plannedSession: { exerciseCount: 5, isRest: false },
      programSource: 'personal',
      workoutSessions: [],
    }).kind).toBe('planned')
  })

  it('uses rest only when no active, completed, or planned session exists', () => {
    expect(deriveTodayTrainingState({
      day,
      plannedSession: { exerciseCount: 0, isRest: true },
      programSource: 'coach',
      workoutSessions: [],
    }).kind).toBe('rest')
  })

  it('prioritizes an active draft over completed and planned sessions', () => {
    expect(deriveTodayTrainingState({
      activeDraft: true,
      day,
      plannedSession: { exerciseCount: 5, isRest: false },
      programSource: 'coach',
      workoutSessions: [completedWorkout],
    }).kind).toBe('active')
  })

  it('preserves coach authority in every derived state', () => {
    expect(deriveTodayTrainingState({
      day,
      plannedSession: { exerciseCount: 4, isRest: false },
      programSource: 'coach',
      workoutSessions: [],
    }).programSource).toBe('coach')
  })

  it('uses the Europe/Zurich day boundary consistently', () => {
    expect(day.timezone).toBe('Europe/Zurich')
    expect(day.localDateKey).toBe('2026-08-31')
    expect(deriveTodayTrainingState({
      day,
      programSource: 'personal',
      workoutSessions: [completedWorkout],
    }).kind).toBe('completed')
    expect(deriveTodayTrainingState({
      day,
      programSource: 'personal',
      workoutSessions: [{ ...completedWorkout, created_at: '2026-08-30T21:59:59.000Z' }],
    }).kind).toBe('rest')
  })

  it('never depends on a workout or program title match', () => {
    expect(deriveTodayTrainingState({
      day,
      plannedSession: { exerciseCount: 0, isRest: true },
      programSource: 'coach',
      workoutSessions: [{ ...completedWorkout, name: 'Unrelated title' }],
    }).kind).toBe('completed')
  })
})
