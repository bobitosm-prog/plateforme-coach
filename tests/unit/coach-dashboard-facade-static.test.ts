import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = ['useCoachDashboard.ts', 'useCoachDashboardController.ts', 'useCoachDashboardMessaging.ts', 'coach-dashboard-contract.ts']
const sources = Object.fromEntries(files.map(file => [file, readFileSync(`app/coach/hooks/${file}`, 'utf8')]))
describe('coach dashboard facade architecture', () => {
  it('keeps every boundary under its hard size limit', () => {
    expect(sources['useCoachDashboard.ts'].split('\n').length - 1).toBeLessThan(250)
    for (const file of files.slice(1)) expect(sources[file].split('\n').length - 1).toBeLessThan(500)
  })
  it('keeps the public facade stable and delegates once', () => {
    expect(sources['useCoachDashboard.ts']).toContain("export default function useCoachDashboard")
    expect(sources['useCoachDashboard.ts'].match(/useCoachDashboardController\(/g)).toHaveLength(1)
  })
  it('keeps realtime and polling in the lifecycle boundary', () => {
    expect(sources['useCoachDashboardController.ts']).not.toContain('subscribeIncoming(')
    expect(sources['useCoachDashboardController.ts']).not.toContain('setInterval(')
    expect(sources['useCoachDashboardMessaging.ts']).toContain('clearInterval(timer)')
    expect(sources['useCoachDashboardMessaging.ts']).toContain('stopIncoming()')
    expect(sources['useCoachDashboardMessaging.ts']).toContain('stopOutgoing()')
  })
  it('introduces no infrastructure authority in the new boundaries', () => {
    const extracted = `${sources['useCoachDashboardMessaging.ts']}\n${sources['coach-dashboard-contract.ts']}`
    expect(extracted).not.toMatch(/createBrowserClient|service_role|select\('\*'\)|:\s*any/)
  })
})
