export type Enforcement = 'blocking' | 'informative'
export type JourneyName = 'clientMobile' | 'coachDesktop'
export type BundleRouteName = 'client' | 'coach' | 'clientDetail'
export type RequestBudgetName = 'application' | 'auth' | 'postgrest' | 'realtime' | 'next-api' | 'total'
export type VitalName = 'lcp' | 'inp' | 'cls'

export type PassMedianBudget = {
  pass: number
  median: number
  enforcement: Enforcement
}

export type PerformanceBudgetRegistry = {
  schemaVersion: 2
  calibration: {
    id: string
    date: string
    scope: 'clientMobile.vitals.inp'
    previous: { pass: number; median: number }
    current: { pass: number; median: number }
    evidence: readonly string[]
  }
  derivation: {
    sourceArtifacts: readonly string[]
    relativeMargin: number
    smallCounterFloor: number
    zeroClsFloor: number
  }
  bundleGzipBytes: {
    routes: Record<BundleRouteName, { total: number; routeSpecific: number }>
    globalDeduplicated: number
  }
  journeys: Record<JourneyName, {
    vitals: Record<VitalName, PassMedianBudget>
    requests: Record<RequestBudgetName, PassMedianBudget>
  }>
}

export type ArtifactVital = { lcp?: number | null; inp?: number | null; cls?: number | null }
export type ArtifactRun = {
  pass: number
  vitals: ArtifactVital
  requests: {
    total: number
    application: number
    categories: Record<'auth' | 'postgrest' | 'realtime' | 'next-api', number>
  }
}

export type PerformanceArtifact = {
  environment: { buildId: string }
  bundle: {
    routes: Record<BundleRouteName, { totals: { gzipBytes: number }; routeSpecificTotals: { gzipBytes: number } }>
    globalDeduplicated: { totals: { gzipBytes: number } }
  }
  journeys: Record<JourneyName, { runs: ArtifactRun[] }>
}

export type BudgetCheck = {
  id: string
  enforcement: Enforcement
  status: 'passed' | 'failed' | 'unavailable'
  observed: number | null
  limit: number
  deltaAbsolute: number | null
  deltaPercent: number | null
}

export type BudgetCheckResult =
  | { status: 'passed'; checks: BudgetCheck[] }
  | { status: 'failed'; checks: BudgetCheck[]; violations: BudgetCheck[] }
  | { status: 'unavailable'; checks: BudgetCheck[]; unavailable: BudgetCheck[] }
  | { status: 'invalid'; issues: string[] }
