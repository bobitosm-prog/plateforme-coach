import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const registry = readFileSync('lib/performance/budgets/registry.ts', 'utf8')
const cli = readFileSync('scripts/check-performance-budgets.ts', 'utf8')

describe('performance budget architecture', () => {
  it('covers every measured bundle route and journey', () => {
    for (const route of ['client', 'coach', 'clientDetail', 'globalDeduplicated']) expect(registry).toContain(route)
    for (const journey of ['clientMobile', 'coachDesktop']) expect(registry).toContain(journey)
    for (const metric of ['lcp', 'inp', 'cls', 'application', 'auth', 'postgrest', 'realtime', "'next-api'", 'total']) expect(registry).toContain(metric)
    expect(registry).toContain("schemaVersion: 2")
    expect(registry).toContain("id: 'phase-8-local-inp-2026-07-24'")
    expect(registry).toContain('previous: { pass: 53, median: 36 }')
    expect(registry).toContain('current: { pass: 64, median: 48 }')
  })

  it('checks static artifacts without starting runtime services', () => {
    expect(cli).not.toMatch(/playwright|next build|next start|supabase|createClient|fetch\s*\(/i)
    expect(cli).toContain('phase-8-baseline-run-1.json')
    expect(cli).toContain('phase-8-baseline-run-2.json')
  })
})
