import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboard = readFileSync('app/coach/hooks/useCoachDashboard.ts', 'utf8')
const home = readFileSync('app/components/tabs/HomeTab.tsx', 'utf8')
const repository = readFileSync('lib/coaching/calendar/repository.ts', 'utf8')
const service = readFileSync('lib/coaching/calendar/service.ts', 'utf8')
const adapter = readFileSync('lib/coaching/calendar/client-adapter.ts', 'utf8')

describe('legacy coaching calendar characterization', () => {
  it('keeps coach appointments distinct from personal scheduled sessions', () => {
    expect(dashboard).toContain('createCalendarClientAdapter')
    expect(home).toContain('createCalendarClientAdapter')
    expect(dashboard).not.toContain("from('coach_appointments')")
    expect(home).not.toContain("from('coach_appointments')")
    expect(repository).toContain("from('coach_appointments')")
    expect(home).toContain("from('scheduled_sessions')")
    expect(repository).not.toContain("from('scheduled_sessions')")
  })

  it('characterizes create ordering as persistence, notification and refresh', () => {
    const insert = service.indexOf('appointments.createForCoach')
    const notification = service.indexOf('notifications.appointmentCreated', insert)
    const create = dashboard.indexOf('calendar.create')
    const refresh = dashboard.indexOf('await fetchScheduledSessions', create)
    expect(insert).toBeGreaterThan(-1)
    expect(notification).toBeGreaterThan(insert)
    expect(create).toBeGreaterThan(-1)
    expect(refresh).toBeGreaterThan(create)
    expect(adapter).toContain("fetcher('/api/send-notification'")
  })

  it('characterizes deletion as a hard delete followed by refresh', () => {
    const deletion = dashboard.indexOf('calendar.delete')
    const refresh = dashboard.indexOf('await fetchScheduledSessions', deletion)
    expect(deletion).toBeGreaterThan(-1)
    expect(refresh).toBeGreaterThan(deletion)
    expect(repository).toContain("from('coach_appointments').delete()")
  })

  it('characterizes explicit list bounds and stable scheduled_at order', () => {
    expect(repository).toContain("order('scheduled_at', { ascending: true })")
    expect(repository).toContain("order('id', { ascending: true })")
    expect(dashboard).toContain('{ limit: 100 }')
    expect(home).toContain('{ days: 366, limit: 10 }')
  })
})
