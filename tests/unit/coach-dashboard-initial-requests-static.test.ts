import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const controller = fs.readFileSync(path.join(root, 'app/coach/hooks/useCoachDashboardController.ts'), 'utf8')
const messaging = fs.readFileSync(path.join(root, 'app/coach/hooks/useCoachDashboardMessaging.ts'), 'utf8')
const measurement = fs.readFileSync(path.join(root, 'e2e/coach-dashboard-initial-requests.spec.ts'), 'utf8')

describe('coach dashboard initial request architecture', () => {
  it('guards the initial load by coach and does not reload the calendar on section changes', () => {
    expect(controller).toContain('initialLoadKeyRef.current === coachId')
    expect(controller).toContain("section === 'messages'")
    expect(controller).toContain('[session?.user?.id, calWeekOffset]')
    expect(controller).not.toContain('[session?.user?.id, calWeekOffset, section]')
  })

  it('loads unread counters eagerly but message history through an idempotent boundary', () => {
    const counterBody = messaging.slice(messaging.indexOf('const refreshCounters'), messaging.indexOf('const loadLastMessages'))
    expect(counterBody).toContain('listUnread')
    expect(counterBody).not.toContain('listLastByContact')
    expect(messaging).toContain('messageListLoader.ensure')
    expect(messaging).toContain('messageListLoader.retry')
  })

  it('keeps a reproducible three-run threshold proving at least twenty percent', () => {
    expect(measurement).toContain('const RUN_COUNT = 3')
    expect(measurement).toContain('const BASELINE_INITIAL_DATA_REQUESTS = 33')
    expect(measurement).toContain('const REQUIRED_REDUCTION = 0.2')
    expect(measurement).toContain('run.total <= maximumAllowed')
  })
})
