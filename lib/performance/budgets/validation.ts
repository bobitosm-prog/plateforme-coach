import type { ArtifactRun, BundleRouteName, JourneyName, PerformanceArtifact, PerformanceBudgetRegistry } from './types.ts'

const BUNDLE_ROUTES: BundleRouteName[] = ['client', 'coach', 'clientDetail']
const JOURNEYS: JourneyName[] = ['clientMobile', 'coachDesktop']
const REQUEST_CATEGORIES = ['auth', 'postgrest', 'realtime', 'next-api'] as const

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function validateBudgetRegistry(registry: PerformanceBudgetRegistry): string[] {
  const issues: string[] = []
  if (registry.schemaVersion !== 2) issues.push('registry.schemaVersion')
  if (!registry.calibration.id || registry.calibration.date !== '2026-07-24') issues.push('registry.calibration.identity')
  if (registry.calibration.scope !== 'clientMobile.vitals.inp') issues.push('registry.calibration.scope')
  for (const [name, limits] of Object.entries({
    previous: registry.calibration.previous,
    current: registry.calibration.current,
  })) {
    if (!finite(limits.pass) || !finite(limits.median)) issues.push(`registry.calibration.${name}`)
  }
  if (!registry.calibration.evidence.length) issues.push('registry.calibration.evidence')
  if (!finite(registry.derivation.relativeMargin)) issues.push('registry.derivation.relativeMargin')
  for (const route of BUNDLE_ROUTES) {
    if (!finite(registry.bundleGzipBytes.routes[route]?.total)) issues.push(`registry.bundle.${route}.total`)
    if (!finite(registry.bundleGzipBytes.routes[route]?.routeSpecific)) issues.push(`registry.bundle.${route}.routeSpecific`)
  }
  if (!finite(registry.bundleGzipBytes.globalDeduplicated)) issues.push('registry.bundle.globalDeduplicated')
  for (const journey of JOURNEYS) {
    for (const [metric, budget] of Object.entries(registry.journeys[journey].vitals)) {
      if (!finite(budget.pass) || !finite(budget.median)) issues.push(`registry.${journey}.vitals.${metric}`)
    }
    for (const [metric, budget] of Object.entries(registry.journeys[journey].requests)) {
      if (!finite(budget.pass) || !finite(budget.median)) issues.push(`registry.${journey}.requests.${metric}`)
    }
  }
  return issues.sort()
}

export function validatePerformanceArtifact(input: unknown): { ok: true; data: PerformanceArtifact } | { ok: false; issues: string[] } {
  const issues: string[] = []
  if (!object(input)) return { ok: false, issues: ['artifact'] }
  const environment = input.environment
  const bundle = input.bundle
  const journeys = input.journeys
  if (!object(environment) || typeof environment.buildId !== 'string' || !environment.buildId) issues.push('artifact.environment.buildId')
  if (!object(bundle) || !object(bundle.routes) || !object(bundle.globalDeduplicated) || !object(bundle.globalDeduplicated.totals) || !finite(bundle.globalDeduplicated.totals.gzipBytes)) {
    issues.push('artifact.bundle.globalDeduplicated.gzipBytes')
  }
  for (const route of BUNDLE_ROUTES) {
    const candidate = object(bundle) && object(bundle.routes) ? bundle.routes[route] : undefined
    if (!object(candidate) || !object(candidate.totals) || !finite(candidate.totals.gzipBytes)) issues.push(`artifact.bundle.${route}.total`)
    if (!object(candidate) || !object(candidate.routeSpecificTotals) || !finite(candidate.routeSpecificTotals.gzipBytes)) issues.push(`artifact.bundle.${route}.routeSpecific`)
  }
  for (const journey of JOURNEYS) {
    const candidate = object(journeys) ? journeys[journey] : undefined
    if (!object(candidate) || !Array.isArray(candidate.runs) || !candidate.runs.length) { issues.push(`artifact.journeys.${journey}`); continue }
    candidate.runs.forEach((rawRun, index) => validateRun(rawRun, `${journey}.runs.${index}`, issues))
  }
  return issues.length ? { ok: false, issues: [...new Set(issues)].sort() } : { ok: true, data: input as unknown as PerformanceArtifact }
}

function validateRun(value: unknown, path: string, issues: string[]): value is ArtifactRun {
  if (!object(value)) { issues.push(path); return false }
  if (!finite(value.pass)) issues.push(`${path}.pass`)
  if (!object(value.vitals)) issues.push(`${path}.vitals`)
  else for (const metric of ['lcp', 'inp', 'cls'] as const) {
    const measured = value.vitals[metric]
    if (measured !== undefined && measured !== null && !finite(measured)) issues.push(`${path}.vitals.${metric}`)
  }
  if (!object(value.requests)) { issues.push(`${path}.requests`); return false }
  if (!finite(value.requests.total)) issues.push(`${path}.requests.total`)
  if (!finite(value.requests.application)) issues.push(`${path}.requests.application`)
  if (!object(value.requests.categories)) issues.push(`${path}.requests.categories`)
  else for (const category of REQUEST_CATEGORIES) if (!finite(value.requests.categories[category])) issues.push(`${path}.requests.${category}`)
  return true
}
