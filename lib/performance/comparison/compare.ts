import { REQUEST_CATEGORIES, summarizeNumbers } from '../baseline.ts'
import {
  COMPARISON_BUNDLE_ROUTES,
  COMPARISON_JOURNEYS,
  COMPARISON_METRICS,
  type ComparisonArtifact,
  type ContextComparison,
  type ComparisonJourney,
  type PerformanceComparisonReport,
  type PerformanceComparisonResult,
  type SeriesComparison,
} from './types.ts'
import { comparisonProtocolFingerprint, validateComparisonArtifact } from './validation.ts'

type NullableSeries = readonly (number | null | undefined)[]

export function compareMetricSeries(
  before: NullableSeries,
  after: NullableSeries,
  coldBefore: NullableSeries = [before[0], before[3]],
  coldAfter: NullableSeries = [after[0], after[3]],
): SeriesComparison {
  const issues: string[] = []
  if (before.length !== 6) issues.push('before.length')
  if (after.length !== 6) issues.push('after.length')
  for (const [side, values] of [['before', before], ['after', after]] as const) {
    values.forEach((value, index) => {
      if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) issues.push(`${side}.${index}`)
    })
  }
  if (coldBefore.length !== 2) issues.push('coldBefore.length')
  if (coldAfter.length !== 2) issues.push('coldAfter.length')
  if (issues.length) return { status: 'invalid', issues: issues.sort() }

  const beforeMissing = before.some(value => value === null || value === undefined)
  const afterMissing = after.some(value => value === null || value === undefined)
  if (beforeMissing || afterMissing) {
    return {
      status: 'unavailable',
      side: beforeMissing && afterMissing ? 'both' : beforeMissing ? 'before' : 'after',
      reason: 'A required observation is unavailable',
    }
  }

  const beforeValues = before as number[]
  const afterValues = after as number[]
  const beforeCold = coldBefore as number[]
  const afterCold = coldAfter as number[]
  const beforeWarm = beforeValues.filter((_, index) => index !== 0 && index !== 3)
  const afterWarm = afterValues.filter((_, index) => index !== 0 && index !== 3)
  const beforeSummary = summarizeNumbers(beforeValues)
  const afterSummary = summarizeNumbers(afterValues)
  const deltaAbsolute = afterSummary.median - beforeSummary.median
  return {
    status: 'comparable',
    before: beforeSummary,
    after: afterSummary,
    cold: { before: summarizeNumbers(beforeCold), after: summarizeNumbers(afterCold) },
    warm: { before: summarizeNumbers(beforeWarm), after: summarizeNumbers(afterWarm) },
    deltaAbsolute,
    deltaPercent: beforeSummary.median === 0 ? null : (deltaAbsolute / beforeSummary.median) * 100,
    direction: deltaAbsolute < 0 ? 'improvement' : deltaAbsolute > 0 ? 'regression' : 'stable',
    dispersion: afterSummary.median >= beforeSummary.min && afterSummary.median <= beforeSummary.max
      ? 'within-before-range'
      : 'outside-before-range',
  }
}

export function comparePerformanceRuns(
  beforeInputs: readonly unknown[],
  afterInputs: readonly unknown[],
): PerformanceComparisonResult {
  const issues: string[] = []
  if (beforeInputs.length !== 2) issues.push('beforeArtifacts.length')
  if (afterInputs.length !== 2) issues.push('afterArtifacts.length')
  if (issues.length) return { status: 'invalid', issues }

  const validated = [...beforeInputs, ...afterInputs].map(validateComparisonArtifact)
  validated.forEach((result, index) => {
    if (result.status === 'invalid') result.issues.forEach(issue => issues.push(`artifacts.${index}.${issue}`))
  })
  if (issues.length) return { status: 'invalid', issues: issues.sort() }
  const artifacts = validated.map(result => {
    if (result.status !== 'valid') throw new Error('validated artifact invariant')
    return result.artifact
  })
  const fingerprint = comparisonProtocolFingerprint(artifacts[0])
  artifacts.slice(1).forEach((artifact, index) => {
    if (comparisonProtocolFingerprint(artifact) !== fingerprint) issues.push(`artifacts.${index + 1}.protocol`)
  })
  if (issues.length) return { status: 'invalid', issues }

  const before = artifacts.slice(0, 2)
  const after = artifacts.slice(2, 4)
  const report: PerformanceComparisonReport = {
    schemaVersion: 1,
    protocol: {
      beforeRuns: 2,
      afterRuns: 2,
      passesPerRun: 3,
      observationsPerJourney: 6,
      coldPasses: [1, 4],
      warmPasses: [2, 3, 5, 6],
      localWithoutThrottling: true,
    },
    artifacts: {
      before: before.map(artifact => artifact.environment),
      after: after.map(artifact => artifact.environment),
    },
    journeys: Object.fromEntries(COMPARISON_JOURNEYS.map(journey => [
      journey,
      compareJourney(before, after, journey),
    ])) as PerformanceComparisonReport['journeys'],
    bundle: {
      routes: Object.fromEntries(COMPARISON_BUNDLE_ROUTES.map(route => [
        route,
        {
          totalGzipBytes: compareContextSeries(
            before.map(item => item.bundle.routes[route].totals.gzipBytes),
            after.map(item => item.bundle.routes[route].totals.gzipBytes),
          ),
          routeSpecificGzipBytes: compareContextSeries(
            before.map(item => item.bundle.routes[route].routeSpecificTotals.gzipBytes),
            after.map(item => item.bundle.routes[route].routeSpecificTotals.gzipBytes),
          ),
        },
      ])) as PerformanceComparisonReport['bundle']['routes'],
      globalDeduplicatedGzipBytes: compareContextSeries(
        before.map(item => item.bundle.globalDeduplicated.totals.gzipBytes),
        after.map(item => item.bundle.globalDeduplicated.totals.gzipBytes),
      ),
    },
  }

  const unavailable = collectUnavailable(report)
  return unavailable.length
    ? { status: 'unavailable', issues: unavailable, report }
    : { status: 'comparable', report }
}

function compareJourney(
  before: ComparisonArtifact[],
  after: ComparisonArtifact[],
  journey: ComparisonJourney,
): PerformanceComparisonReport['journeys'][ComparisonJourney] {
  const beforeRuns = before.flatMap(artifact => artifact.journeys[journey].runs)
  const afterRuns = after.flatMap(artifact => artifact.journeys[journey].runs)
  const metrics = Object.fromEntries(COMPARISON_METRICS.map(metric => [
    metric,
    compareMetricSeries(
      beforeRuns.map(run => run.vitals[metric]),
      afterRuns.map(run => run.vitals[metric]),
    ),
  ])) as PerformanceComparisonReport['journeys'][ComparisonJourney]['metrics']
  const requestNames = ['total', 'application', ...REQUEST_CATEGORIES] as const
  const requests = Object.fromEntries(requestNames.map(name => [
    name,
    compareMetricSeries(
      beforeRuns.map(run => requestValue(run, name)),
      afterRuns.map(run => requestValue(run, name)),
    ),
  ])) as PerformanceComparisonReport['journeys'][ComparisonJourney]['requests']
  return { metrics, requests }
}

function requestValue(
  run: ComparisonArtifact['journeys'][ComparisonJourney]['runs'][number],
  name: 'total' | 'application' | (typeof REQUEST_CATEGORIES)[number],
) {
  return name === 'total' || name === 'application' ? run.requests[name] : run.requests.categories[name]
}

function compareContextSeries(before: number[], after: number[]): ContextComparison {
  const beforeSummary = summarizeNumbers(before)
  const afterSummary = summarizeNumbers(after)
  const deltaAbsolute = afterSummary.median - beforeSummary.median
  return {
    before: beforeSummary,
    after: afterSummary,
    deltaAbsolute,
    deltaPercent: beforeSummary.median === 0 ? null : (deltaAbsolute / beforeSummary.median) * 100,
  }
}

function collectUnavailable(report: PerformanceComparisonReport): string[] {
  const issues: string[] = []
  for (const journey of COMPARISON_JOURNEYS) {
    for (const metric of COMPARISON_METRICS) {
      if (report.journeys[journey].metrics[metric].status !== 'comparable') issues.push(`${journey}.metrics.${metric}`)
    }
  }
  return issues.sort()
}
