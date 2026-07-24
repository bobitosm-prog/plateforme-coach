import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const runner = readFileSync('scripts/run-performance-baseline.ts', 'utf8')
const spec = readFileSync('e2e/performance-baseline.spec.ts', 'utf8')

describe('production performance baseline architecture', () => {
  it('uses a webpack production build and never starts Next dev', () => {
    expect(runner).toContain("'build', '--webpack'")
    expect(runner).toContain("['start', '--hostname'")
    expect(runner).not.toContain("['dev'")
  })

  it('requires complete manifests and cleans temporary resources', () => {
    for (const contract of ['BUILD_ID', 'build-manifest.json', 'routes-manifest.json', 'prerender-manifest.json', 'server/app-paths-manifest.json']) expect(runner).toContain(contract)
    expect(runner).toContain('assertTemporaryPortsClosed([3211])')
    expect(runner).toContain('assertMailpitEmpty()')
  })

  it('captures real observers, interactions and three independent passes', () => {
    expect(spec).toContain("observe('largest-contentful-paint'")
    expect(spec).toContain("observe('layout-shift'")
    expect(spec).toContain("observe('event'")
    expect(spec).toContain('!shift.hadRecentInput')
    expect(spec).toContain('interactionId > 0')
    expect(spec).toContain('pass <= 3')
  })

  it('keeps sanitized interaction attribution opt-in and can block only local posters', () => {
    for (const field of [
      'inputDelay',
      'processingDuration',
      'presentationDelay',
      'associatedLongTasks',
      'associatedResources',
      'domBefore',
      'domAfter',
      'imageDecodeObservable',
    ]) expect(spec).toContain(field)
    expect(spec).toContain("MOOVX_PERFORMANCE_DIAGNOSTICS === '1'")
    expect(spec).toContain("url.pathname.startsWith('/images/video-posters/')")
    expect(spec).not.toMatch(/innerText|textContent|localStorage|sessionStorage/)
    expect(runner).toContain('MOOVX_INP_DIAGNOSTIC_MATRIX_PATH')
    expect(runner).toContain("'normal-cold'")
    expect(runner).toContain("'blocked-cold'")
    expect(runner).toContain("'normal-hot'")
  })

  it('blocks external browser origins and does not expose fixture identities', () => {
    expect(spec).toContain("route.abort('blockedbyclient')")
    expect(spec).not.toMatch(/\.email\b|fixture\.ids\s*[,}]/)
  })
})
