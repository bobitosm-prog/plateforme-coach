import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const boundaries = [
  'app/error.tsx',
  'app/coach/error.tsx',
  'app/client/[id]/error.tsx',
] as const
const support = [
  'app/components/errors/DomainErrorBoundary.tsx',
  'app/components/errors/DomainErrorView.tsx',
  'app/components/errors/error-reset-gate.ts',
  'app/components/errors/types.ts',
] as const
const sources = Object.fromEntries(
  [...boundaries, ...support].map(path => [path, readFileSync(path, 'utf8')]),
)

describe('critical domain error boundary architecture', () => {
  it('provides exactly one boundary for each selected scope', () => {
    for (const path of boundaries) {
      expect(existsSync(path), path).toBe(true)
      expect(sources[path].match(/export default function/g), path).toHaveLength(1)
      expect(sources[path]).toContain("'use client'")
      expect(sources[path]).toContain('{ reset }')
      expect(sources[path]).toContain('reset={reset}')
    }
  })

  it('keeps App Router files thin and delegates the shared contract', () => {
    for (const path of boundaries) {
      expect(sources[path].split('\n').length, path).toBeLessThan(15)
      expect(sources[path]).toContain('DomainErrorBoundary')
    }
    expect(sources['app/error.tsx']).toContain('domain="global"')
    expect(sources['app/coach/error.tsx']).toContain('domain="coach"')
    expect(sources['app/client/[id]/error.tsx']).toContain('domain="client-detail"')
  })

  it('never exposes or logs the raw error contract', () => {
    const combined = Object.values(sources).join('\n')
    for (const forbidden of [
      'error.message', 'error.stack', 'error.cause', 'error.digest',
      'console.', 'JSON.stringify(error)', 'window.', 'localStorage',
      'supabase', 'service_role', 'createClient', 'repository', 'fetch(',
    ]) expect(combined).not.toContain(forbidden)
  })

  it('does not confuse rendering failures with domain states or onboarding', () => {
    const combined = Object.values(sources).join('\n')
    for (const forbidden of [
      'DashboardProfileError', 'ClientDetailUnavailableView',
      'ClientDetailLoadingView', 'onboarding', 'permission denied',
      'Client introuvable',
    ]) expect(combined).not.toContain(forbidden)
  })

  it('uses reset once behind a gate and safe explicit navigation', () => {
    const controller = sources['app/components/errors/DomainErrorBoundary.tsx']
    const gate = sources['app/components/errors/error-reset-gate.ts']
    expect(controller).toContain('gate.run(reset)')
    expect(controller).toContain('router.replace(copy.navigationTarget)')
    expect(gate).toContain("if (locked) return 'locked'")
    expect(gate.match(/reset\(\)/g)).toHaveLength(1)
  })

  it('keeps every new boundary below 500 lines', () => {
    for (const [path, source] of Object.entries(sources)) {
      expect(source.split('\n').length, path).toBeLessThan(500)
    }
  })

  it('keeps real navigation, back and protected-resource failures on their normal path', () => {
    const e2e = readFileSync('e2e/performance-segment-loading.spec.ts', 'utf8')
    expect(e2e).toContain('page.goBack()')
    expect(e2e).toContain('fixture.secondClient.id')
    expect(e2e).toContain("toHaveCount(0)")
    expect(e2e).not.toContain('data-critical-domain-error')
  })
})
