import { summarizeNumbers } from '../baseline.ts'
import { PERFORMANCE_BUDGETS } from './registry.ts'
import type { BudgetCheck, BudgetCheckResult, Enforcement, JourneyName, PerformanceArtifact, PerformanceBudgetRegistry, RequestBudgetName, VitalName } from './types.ts'
import { validateBudgetRegistry, validatePerformanceArtifact } from './validation.ts'

const JOURNEYS: JourneyName[] = ['clientMobile', 'coachDesktop']
const VITALS: VitalName[] = ['lcp', 'inp', 'cls']
const REQUESTS: RequestBudgetName[] = ['application', 'auth', 'postgrest', 'realtime', 'next-api', 'total']

function check(id: string, observed: number | null | undefined, limit: number, enforcement: Enforcement): BudgetCheck {
  if (observed === null || observed === undefined) return { id, enforcement, status: 'unavailable', observed: null, limit, deltaAbsolute: null, deltaPercent: null }
  const deltaAbsolute = observed - limit
  return {
    id, enforcement, status: observed <= limit ? 'passed' : 'failed', observed, limit, deltaAbsolute,
    deltaPercent: limit === 0 ? (observed === 0 ? 0 : null) : (deltaAbsolute / limit) * 100,
  }
}

function requestValue(artifact: PerformanceArtifact, journey: JourneyName, runIndex: number, metric: RequestBudgetName) {
  const requests = artifact.journeys[journey].runs[runIndex].requests
  if (metric === 'total' || metric === 'application') return requests[metric]
  return requests.categories[metric]
}

export function checkPerformanceBudgets(input: unknown, registry: PerformanceBudgetRegistry = PERFORMANCE_BUDGETS): BudgetCheckResult {
  const registryIssues = validateBudgetRegistry(registry)
  if (registryIssues.length) return { status: 'invalid', issues: registryIssues }
  const validated = validatePerformanceArtifact(input)
  if (!validated.ok) return { status: 'invalid', issues: validated.issues }
  const artifact = validated.data
  const checks: BudgetCheck[] = []

  for (const route of ['client', 'coach', 'clientDetail'] as const) {
    const limits = registry.bundleGzipBytes.routes[route]
    checks.push(check(`bundle.${route}.total`, artifact.bundle.routes[route].totals.gzipBytes, limits.total, 'blocking'))
    checks.push(check(`bundle.${route}.routeSpecific`, artifact.bundle.routes[route].routeSpecificTotals.gzipBytes, limits.routeSpecific, 'blocking'))
  }
  checks.push(check('bundle.globalDeduplicated', artifact.bundle.globalDeduplicated.totals.gzipBytes, registry.bundleGzipBytes.globalDeduplicated, 'blocking'))

  for (const journey of JOURNEYS) {
    const runs = artifact.journeys[journey].runs
    for (const metric of VITALS) {
      const budget = registry.journeys[journey].vitals[metric]
      const values = runs.map(run => run.vitals[metric])
      values.forEach((value, index) => checks.push(check(`${journey}.vitals.${metric}.pass.${index + 1}`, value, budget.pass, budget.enforcement)))
      const available = values.filter((value): value is number => value !== null && value !== undefined)
      checks.push(check(`${journey}.vitals.${metric}.median`, available.length === values.length ? summarizeNumbers(available).median : null, budget.median, budget.enforcement))
    }
    for (const metric of REQUESTS) {
      const budget = registry.journeys[journey].requests[metric]
      const values = runs.map((_, index) => requestValue(artifact, journey, index, metric))
      values.forEach((value, index) => checks.push(check(`${journey}.requests.${metric}.pass.${index + 1}`, value, budget.pass, budget.enforcement)))
      checks.push(check(`${journey}.requests.${metric}.median`, summarizeNumbers(values).median, budget.median, budget.enforcement))
    }
  }

  checks.sort((left, right) => left.id.localeCompare(right.id))
  const unavailable = checks.filter(item => item.status === 'unavailable' && item.enforcement === 'blocking')
  if (unavailable.length) return { status: 'unavailable', checks, unavailable }
  const violations = checks.filter(item => item.status === 'failed' && item.enforcement === 'blocking')
  if (violations.length) return { status: 'failed', checks, violations }
  return { status: 'passed', checks }
}
