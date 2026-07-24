import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkPerformanceBudgets, PERFORMANCE_BUDGETS, validateBudgetRegistry, type PerformanceArtifact, type PerformanceBudgetRegistry } from '../../lib/performance/budgets'

const load = (name = 'phase-8-baseline-run-2.json') => JSON.parse(readFileSync(`perf/baseline/${name}`, 'utf8')) as PerformanceArtifact

describe('performance regression budgets', () => {
  it('keeps a structurally valid registry derived from both captures', () => {
    expect(validateBudgetRegistry(PERFORMANCE_BUDGETS)).toEqual([])
    expect(PERFORMANCE_BUDGETS.derivation.sourceArtifacts).toHaveLength(2)
    expect(PERFORMANCE_BUDGETS.schemaVersion).toBe(2)
    expect(PERFORMANCE_BUDGETS.calibration).toMatchObject({
      scope: 'clientMobile.vitals.inp',
      previous: { pass: 53, median: 36 },
      current: { pass: 64, median: 48 },
    })
  })

  it('changes only the two calibrated client INP limits', () => {
    expect(PERFORMANCE_BUDGETS.bundleGzipBytes).toEqual({
      routes: {
        client: { total: 975_513, routeSpecific: 0 },
        coach: { total: 985_288, routeSpecific: 9_775 },
        clientDetail: { total: 1_013_943, routeSpecific: 38_430 },
      },
      globalDeduplicated: 1_023_718,
    })
    expect(PERFORMANCE_BUDGETS.journeys).toEqual({
      clientMobile: {
        vitals: {
          lcp: { pass: 458, median: 436, enforcement: 'blocking' },
          inp: { pass: 64, median: 48, enforcement: 'blocking' },
          cls: { pass: 0.012, median: 0.012, enforcement: 'blocking' },
        },
        requests: {
          application: { pass: 88, median: 75, enforcement: 'blocking' },
          auth: { pass: 4, median: 4, enforcement: 'blocking' },
          postgrest: { pass: 80, median: 66, enforcement: 'blocking' },
          realtime: { pass: 4, median: 4, enforcement: 'blocking' },
          'next-api': { pass: 2, median: 2, enforcement: 'blocking' },
          total: { pass: 135, median: 121, enforcement: 'informative' },
        },
      },
      coachDesktop: {
        vitals: {
          lcp: { pass: 339, median: 313, enforcement: 'blocking' },
          inp: { pass: 27, median: 27, enforcement: 'blocking' },
          cls: { pass: 0.001, median: 0.001, enforcement: 'blocking' },
        },
        requests: {
          application: { pass: 44, median: 44, enforcement: 'blocking' },
          auth: { pass: 7, median: 7, enforcement: 'blocking' },
          postgrest: { pass: 30, median: 29, enforcement: 'blocking' },
          realtime: { pass: 6, median: 6, enforcement: 'blocking' },
          'next-api': { pass: 2, median: 2, enforcement: 'blocking' },
          total: { pass: 119, median: 118, enforcement: 'informative' },
        },
      },
    })
  })

  it.each([
    'phase-8-baseline-run-1.json',
    'phase-8-baseline-run-2.json',
    'phase-8-after-initial-run-1.json',
    'phase-8-after-initial-run-2.json',
    'phase-8-after-validation-run-1.json',
    'phase-8-after-validation-run-2.json',
  ])('passes measured artifact %s', name => {
    expect(checkPerformanceBudgets(load(name)).status).toBe('passed')
  })

  it('reports bundle excess', () => {
    const artifact = load()
    artifact.bundle.routes.coach.totals.gzipBytes = PERFORMANCE_BUDGETS.bundleGzipBytes.routes.coach.total + 1
    const result = checkPerformanceBudgets(artifact)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.violations.map(item => item.id)).toContain('bundle.coach.total')
  })

  it.each(['lcp', 'inp', 'cls'] as const)('reports %s excess on a single pass', metric => {
    const artifact = load()
    artifact.journeys.clientMobile.runs[0].vitals[metric] = PERFORMANCE_BUDGETS.journeys.clientMobile.vitals[metric].pass + 1
    const result = checkPerformanceBudgets(artifact)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.violations.map(item => item.id)).toContain(`clientMobile.vitals.${metric}.pass.1`)
  })

  it.each([
    ['application', 'application'],
    ['postgrest', 'categories'],
  ] as const)('reports %s request excess', (metric, location) => {
    const artifact = load()
    const limit = PERFORMANCE_BUDGETS.journeys.clientMobile.requests[metric].pass
    if (location === 'application') artifact.journeys.clientMobile.runs[0].requests.application = limit + 1
    else artifact.journeys.clientMobile.runs[0].requests.categories.postgrest = limit + 1
    const result = checkPerformanceBudgets(artifact)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.violations.map(item => item.id)).toContain(`clientMobile.requests.${metric}.pass.1`)
  })

  it('returns unavailable instead of treating a missing vital as zero', () => {
    const artifact = load()
    delete artifact.journeys.clientMobile.runs[0].vitals.inp
    const result = checkPerformanceBudgets(artifact)
    expect(result.status).toBe('unavailable')
    if (result.status === 'unavailable') expect(result.unavailable.map(item => item.id)).toEqual(['clientMobile.vitals.inp.median', 'clientMobile.vitals.inp.pass.1'])
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 'large'])('rejects invalid numeric value %s', value => {
    const artifact = load() as unknown as { bundle: { globalDeduplicated: { totals: { gzipBytes: unknown } } } }
    artifact.bundle.globalDeduplicated.totals.gzipBytes = value
    expect(checkPerformanceBudgets(artifact).status).toBe('invalid')
  })

  it('rejects a missing route or journey', () => {
    const missingRoute = load() as unknown as { bundle: { routes: Record<string, unknown> } }
    delete missingRoute.bundle.routes.coach
    expect(checkPerformanceBudgets(missingRoute).status).toBe('invalid')
    const missingJourney = load() as unknown as { journeys: Record<string, unknown> }
    delete missingJourney.journeys.coachDesktop
    expect(checkPerformanceBudgets(missingJourney).status).toBe('invalid')
  })

  it('sorts violations deterministically', () => {
    const artifact = load()
    artifact.bundle.globalDeduplicated.totals.gzipBytes = PERFORMANCE_BUDGETS.bundleGzipBytes.globalDeduplicated + 1
    artifact.journeys.clientMobile.runs[0].vitals.lcp = 999
    artifact.journeys.coachDesktop.runs[0].requests.categories.postgrest = 99
    const result = checkPerformanceBudgets(artifact)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') {
      const ids = result.violations.map(item => item.id)
      expect(ids).toEqual([...ids].sort())
    }
  })

  it('accepts a value exactly at the threshold and does not mutate inputs', () => {
    const artifact = load()
    const registry = structuredClone(PERFORMANCE_BUDGETS) as PerformanceBudgetRegistry
    registry.journeys.clientMobile.vitals.lcp.pass = artifact.journeys.clientMobile.runs[0].vitals.lcp as number
    const before = JSON.stringify(artifact)
    expect(checkPerformanceBudgets(artifact, registry).status).toBe('passed')
    expect(JSON.stringify(artifact)).toBe(before)
  })
})
