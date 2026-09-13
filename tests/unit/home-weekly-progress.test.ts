import { readFileSync } from 'node:fs'

import { buildHomeWeeklyProgress } from '@/lib/home/home-weekly-progress'
import { describe, expect, it } from 'vitest'

describe('home weekly progress', () => {
  const now = new Date('2026-09-13T10:00:00.000Z')

  it('counts every canonical completed workout, including repeated program days', () => {
    const result = buildHomeWeeklyProgress({
      now,
      workoutSessions: [
        { id: 'session-a', completed: true, created_at: '2026-09-07T08:00:00.000Z' },
        { id: 'session-b', completed: true, created_at: '2026-09-10T08:00:00.000Z' },
        { id: 'session-c', completed: true, created_at: '2026-09-12T08:00:00.000Z' },
      ],
      scheduledSessions: [],
    })

    expect(result.completed).toBe(3)
  })

  it('excludes unfinished, previous-week and duplicate canonical sessions', () => {
    const result = buildHomeWeeklyProgress({
      now,
      workoutSessions: [
        { id: 'current', completed: true, created_at: '2026-09-07T08:00:00.000Z' },
        { id: 'current', completed: true, created_at: '2026-09-07T08:00:00.000Z' },
        { id: 'draft', completed: false, created_at: '2026-09-09T08:00:00.000Z' },
        { id: 'previous', completed: true, created_at: '2026-09-06T20:00:00.000Z' },
      ],
      scheduledSessions: [],
    })

    expect(result.completed).toBe(1)
  })

  it('calculates adherence from completed planned sessions and ignores rest days', () => {
    const result = buildHomeWeeklyProgress({
      now,
      workoutSessions: [],
      scheduledSessions: [
        { scheduled_date: '2026-09-07', session_type: 'push_a', completed: true },
        { scheduled_date: '2026-09-09', session_type: 'custom', completed: false },
        { scheduled_date: '2026-09-11', session_type: 'legs_a', completed: true },
        { scheduled_date: '2026-09-13', session_type: 'repos', completed: false },
      ],
    })

    expect(result.planned).toBe(3)
    expect(result.adherence).toBeCloseTo(2 / 3)
  })

  it('does not invent adherence when no session is planned', () => {
    const result = buildHomeWeeklyProgress({
      now,
      workoutSessions: [{ id: 'free', completed: true, created_at: '2026-09-12T08:00:00.000Z' }],
      scheduledSessions: [{ scheduled_date: '2026-09-13', session_type: 'rest', completed: false }],
    })

    expect(result.completed).toBe(1)
    expect(result.planned).toBe(0)
    expect(result.adherence).toBeNull()
  })

  it('uses Zurich week boundaries across daylight-saving time', () => {
    const result = buildHomeWeeklyProgress({
      now: new Date('2026-03-29T10:00:00.000Z'),
      workoutSessions: [
        { id: 'before', completed: true, created_at: '2026-03-22T22:59:59.999Z' },
        { id: 'monday', completed: true, created_at: '2026-03-22T23:00:00.000Z' },
        { id: 'sunday', completed: true, created_at: '2026-03-29T21:59:59.999Z' },
        { id: 'after', completed: true, created_at: '2026-03-29T22:00:00.000Z' },
      ],
      scheduledSessions: [],
    })

    expect(result.completed).toBe(2)
  })

  it('wires Home to canonical workouts and planned-session adherence', () => {
    const page = readFileSync('app/(application)/page.tsx', 'utf8')

    expect(page).toContain('buildHomeWeeklyProgress({')
    expect(page).toContain('sessionsThisWeek: h.workoutHistoryState === \'error\' ? null : homeWeeklyProgress.completed')
    expect(page).toContain('adherence: homeWeeklyProgress.adherence')
    expect(page).not.toContain('sessionsThisWeek: h.completedThisWeek?.size')
  })
})
