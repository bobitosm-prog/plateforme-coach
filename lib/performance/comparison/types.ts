import type { NumericSummary, RequestCategory } from '../baseline.ts'

export const COMPARISON_JOURNEYS = ['clientMobile', 'coachDesktop'] as const
export const COMPARISON_METRICS = ['lcp', 'inp', 'cls'] as const
export const COMPARISON_BUNDLE_ROUTES = ['client', 'coach', 'clientDetail'] as const

export type ComparisonJourney = (typeof COMPARISON_JOURNEYS)[number]
export type ComparisonMetric = (typeof COMPARISON_METRICS)[number]
export type ComparisonBundleRoute = (typeof COMPARISON_BUNDLE_ROUTES)[number]

export type ComparisonArtifactRun = {
  pass: number
  vitals: {
    lcp: number | null
    inp: number | null
    cls: number | null
    eventTimingSupported: boolean
    interactionCount: number
  }
  requests: {
    total: number
    application: number
    categories: Record<RequestCategory, number>
  }
  steps: Array<{ name: string }>
}

export type ComparisonArtifact = {
  schemaVersion: 1
  environment: {
    measuredAt: string
    commit: string
    buildId: string
    node: string
    npm: string
    next: string
    playwright: string
    browser: string
    timezone: string
    viewports: Record<ComparisonJourney, { width: number; height: number }>
    network: string
  }
  bundle: {
    routes: Record<ComparisonBundleRoute, {
      totals: { rawBytes: number; gzipBytes: number }
      routeSpecificTotals: { rawBytes: number; gzipBytes: number }
    }>
    globalDeduplicated: { totals: { rawBytes: number; gzipBytes: number } }
  }
  journeys: Record<ComparisonJourney, {
    runs: ComparisonArtifactRun[]
  }>
}

export type ArtifactValidationResult =
  | { status: 'valid'; artifact: ComparisonArtifact }
  | { status: 'invalid'; issues: string[] }

export type SeriesComparison =
  | {
      status: 'comparable'
      before: NumericSummary
      after: NumericSummary
      cold: { before: NumericSummary; after: NumericSummary }
      warm: { before: NumericSummary; after: NumericSummary }
      deltaAbsolute: number
      deltaPercent: number | null
      direction: 'improvement' | 'regression' | 'stable'
      dispersion: 'within-before-range' | 'outside-before-range'
    }
  | { status: 'unavailable'; side: 'before' | 'after' | 'both'; reason: string }
  | { status: 'invalid'; issues: string[] }

export type ContextComparison = {
  before: NumericSummary
  after: NumericSummary
  deltaAbsolute: number
  deltaPercent: number | null
}

export type PerformanceComparisonReport = {
  schemaVersion: 1
  protocol: {
    beforeRuns: 2
    afterRuns: 2
    passesPerRun: 3
    observationsPerJourney: 6
    coldPasses: number[]
    warmPasses: number[]
    localWithoutThrottling: true
  }
  artifacts: {
    before: Array<ComparisonArtifact['environment']>
    after: Array<ComparisonArtifact['environment']>
  }
  journeys: Record<ComparisonJourney, {
    metrics: Record<ComparisonMetric, SeriesComparison>
    requests: Record<'total' | 'application' | RequestCategory, SeriesComparison>
  }>
  bundle: {
    routes: Record<ComparisonBundleRoute, {
      totalGzipBytes: ContextComparison
      routeSpecificGzipBytes: ContextComparison
    }>
    globalDeduplicatedGzipBytes: ContextComparison
  }
}

export type PerformanceComparisonResult =
  | { status: 'comparable'; report: PerformanceComparisonReport }
  | { status: 'unavailable'; issues: string[]; report: PerformanceComparisonReport }
  | { status: 'invalid'; issues: string[] }
