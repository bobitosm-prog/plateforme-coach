import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareMetricSeries, comparePerformanceRuns, validateComparisonArtifact } from '../../lib/performance/comparison/index.ts'
import { runPerformanceComparisonCli } from '../../scripts/compare-performance-runs.ts'

const temp = (name: string) => join('/tmp', `moovx-performance-comparison-${process.pid}-${name}`)

function artifact(options: {
  buildId?: string
  lcp?: number[]
  inp?: Array<number | null>
  cls?: number[]
  browser?: string
} = {}) {
  const lcp = options.lcp ?? [400, 360, 380]
  const inp = options.inp ?? [32, 24, 24]
  const cls = options.cls ?? [0.01, 0.02, 0.01]
  const categories = {
    auth: 1, postgrest: 2, realtime: 1, 'next-api': 1, document: 1,
    javascript: 10, css: 1, font: 2, 'image-media': 3, 'other-local': 0,
  }
  const runs = (steps: string[]) => [0, 1, 2].map(index => ({
    pass: index + 1,
    vitals: {
      lcp: lcp[index],
      inp: inp[index],
      cls: cls[index],
      eventTimingSupported: true,
      interactionCount: inp[index] === null ? 0 : 3,
    },
    requests: { total: 22 + index, application: 6 + index, categories },
    steps: steps.map(name => ({ name })),
  }))
  const route = {
    totals: { rawBytes: 2000, gzipBytes: 1000 },
    routeSpecificTotals: { rawBytes: 200, gzipBytes: 100 },
  }
  return {
    schemaVersion: 1,
    environment: {
      measuredAt: '2026-07-24T12:00:00.000Z',
      commit: '0123456789012345678901234567890123456789',
      buildId: options.buildId ?? 'build-a',
      node: 'v24.14.0',
      npm: '11.9.0',
      next: '16.1.6',
      playwright: '^1.61.1',
      browser: options.browser ?? '149.0.7827.55',
      timezone: 'Europe/Zurich',
      viewports: {
        clientMobile: { width: 390, height: 844 },
        coachDesktop: { width: 1440, height: 900 },
      },
      network: 'localhost-only; external browser requests aborted and asserted absent',
    },
    bundle: {
      routes: { client: route, coach: route, clientDetail: route },
      globalDeduplicated: { totals: { rawBytes: 2200, gzipBytes: 1100 } },
    },
    journeys: {
      clientMobile: { runs: runs(['home', 'training', 'nutrition']) },
      coachDesktop: { runs: runs(['home', 'clients', 'messages', 'client-detail']) },
    },
  }
}

describe('performance comparison', () => {
  it('computes improvement, regression, stability, even median and percentages exactly', () => {
    const improved = compareMetricSeries([10, 20, 30, 40, 50, 60], [5, 10, 15, 20, 25, 30])
    expect(improved).toMatchObject({
      status: 'comparable',
      before: { median: 35 },
      after: { median: 17.5 },
      deltaAbsolute: -17.5,
      deltaPercent: -50,
      direction: 'improvement',
    })
    expect(compareMetricSeries([1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2])).toMatchObject({
      status: 'comparable', direction: 'regression', deltaPercent: 100,
    })
    expect(compareMetricSeries([3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3])).toMatchObject({
      status: 'comparable', direction: 'stable', deltaAbsolute: 0,
    })
  })

  it('keeps zero references non-calculable and missing metrics unavailable', () => {
    expect(compareMetricSeries([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0])).toMatchObject({
      status: 'comparable', deltaPercent: null,
    })
    expect(compareMetricSeries([1, 1, null, 1, 1, 1], [1, 1, 1, 1, 1, 1])).toEqual({
      status: 'unavailable', side: 'before', reason: 'A required observation is unavailable',
    })
  })

  it.each([
    [[1, 2], [1, 2, 3, 4, 5, 6], 'before.length'],
    [[1, 2, 3, 4, 5, Number.NaN], [1, 2, 3, 4, 5, 6], 'before.5'],
    [[1, 2, 3, 4, 5, Number.POSITIVE_INFINITY], [1, 2, 3, 4, 5, 6], 'before.5'],
    [[1, 2, 3, 4, 5, -1], [1, 2, 3, 4, 5, 6], 'before.5'],
  ])('fails closed for invalid series %#', (before, after, issue) => {
    const result = compareMetricSeries(before, after)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.issues).toContain(issue)
  })

  it('validates strict artifacts and rejects incompatible protocols', () => {
    expect(validateComparisonArtifact(artifact()).status).toBe('valid')
    const withoutInteraction = artifact()
    withoutInteraction.journeys.clientMobile.runs[0].vitals.interactionCount = 0
    expect(validateComparisonArtifact(withoutInteraction)).toMatchObject({
      status: 'invalid',
      issues: ['artifact.journeys.clientMobile.runs.0.vitals.inpObservation'],
    })
    const result = comparePerformanceRuns(
      [artifact({ buildId: 'before-1' }), artifact({ buildId: 'before-2' })],
      [artifact({ buildId: 'after-1' }), artifact({ buildId: 'after-2', browser: 'other' })],
    )
    expect(result).toEqual({ status: 'invalid', issues: ['artifacts.3.protocol'] })
  })

  it('compares two before and two after artifacts without mutating inputs', () => {
    const before = [artifact({ buildId: 'before-1' }), artifact({ buildId: 'before-2' })]
    const after = [
      artifact({ buildId: 'after-1', lcp: [300, 280, 290] }),
      artifact({ buildId: 'after-2', lcp: [310, 285, 295] }),
    ]
    const snapshot = JSON.stringify({ before, after })
    const first = comparePerformanceRuns(before, after)
    const second = comparePerformanceRuns(before, after)
    expect(first).toEqual(second)
    expect(JSON.stringify({ before, after })).toBe(snapshot)
    expect(first.status).toBe('comparable')
    if (first.status === 'comparable') {
      expect(first.report.protocol).toMatchObject({ beforeRuns: 2, afterRuns: 2, observationsPerJourney: 6 })
      expect(first.report.journeys.clientMobile.metrics.lcp).toMatchObject({
        status: 'comparable',
        before: { values: [400, 360, 380, 400, 360, 380] },
        after: { values: [300, 280, 290, 310, 285, 295] },
      })
    }
  })

  it('returns unavailable instead of inventing an INP value', () => {
    const result = comparePerformanceRuns(
      [artifact(), artifact()],
      [artifact(), artifact({ inp: [32, null, 24] })],
    )
    expect(result.status).toBe('unavailable')
  })

  it('runs the CLI deterministically and returns non-zero for invalid input', () => {
    const paths = ['before-1.json', 'before-2.json', 'after-1.json', 'after-2.json', 'report.json'].map(temp)
    try {
      paths.slice(0, 4).forEach((path, index) => writeFileSync(path, JSON.stringify(artifact({ buildId: `build-${index}` }))))
      const logs: string[] = []
      const code = runPerformanceComparisonCli([
        '--before', paths[0], '--before', paths[1],
        '--after', paths[2], '--after', paths[3],
        '--output', paths[4],
      ], { log: message => logs.push(message), error: message => logs.push(message) })
      expect(code).toBe(0)
      expect(JSON.parse(readFileSync(paths[4], 'utf8'))).toMatchObject({ schemaVersion: 1 })
      expect(logs.join('\n')).toContain('LCP')
      expect(runPerformanceComparisonCli(['--before', paths[0]], { log() {}, error() {} })).toBe(1)
    } finally {
      paths.forEach(path => rmSync(path, { force: true }))
    }
  })
})
