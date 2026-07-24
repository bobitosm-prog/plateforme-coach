import type { PerformanceBudgetRegistry } from './types.ts'

export const PERFORMANCE_BUDGETS = {
  schemaVersion: 2,
  calibration: {
    id: 'phase-8-local-inp-2026-07-24',
    date: '2026-07-24',
    scope: 'clientMobile.vitals.inp',
    previous: { pass: 53, median: 36 },
    current: { pass: 64, median: 48 },
    evidence: [
      'phase-8-after-initial-run-1.json',
      'phase-8-after-initial-run-2.json',
      'phase-8-after-validation-run-1.json',
      'phase-8-after-validation-run-2.json',
      'phase-8-inp-causal-matrix.json',
    ],
  },
  derivation: {
    sourceArtifacts: ['perf/baseline/phase-8-baseline-run-1.json', 'perf/baseline/phase-8-baseline-run-2.json'],
    relativeMargin: 0.10,
    smallCounterFloor: 1,
    zeroClsFloor: 0.001,
  },
  bundleGzipBytes: {
    routes: {
      client: { total: 975_513, routeSpecific: 0 },
      coach: { total: 985_288, routeSpecific: 9_775 },
      clientDetail: { total: 1_013_943, routeSpecific: 38_430 },
    },
    globalDeduplicated: 1_023_718,
  },
  journeys: {
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
  },
} as const satisfies PerformanceBudgetRegistry
