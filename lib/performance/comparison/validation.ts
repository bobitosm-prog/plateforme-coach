import { REQUEST_CATEGORIES } from '../baseline.ts'
import {
  COMPARISON_BUNDLE_ROUTES,
  COMPARISON_JOURNEYS,
  COMPARISON_METRICS,
  type ArtifactValidationResult,
  type ComparisonArtifact,
  type ComparisonJourney,
} from './types.ts'

const EXPECTED_STEPS: Record<ComparisonJourney, string[]> = {
  clientMobile: ['home', 'training', 'nutrition'],
  coachDesktop: ['home', 'clients', 'messages', 'client-detail'],
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

export function validateComparisonArtifact(input: unknown): ArtifactValidationResult {
  const issues: string[] = []
  if (!object(input)) return { status: 'invalid', issues: ['artifact'] }
  if (input.schemaVersion !== 1) issues.push('artifact.schemaVersion')
  validateEnvironment(input.environment, issues)
  validateBundle(input.bundle, issues)

  if (!object(input.journeys)) issues.push('artifact.journeys')
  for (const journey of COMPARISON_JOURNEYS) {
    const value = object(input.journeys) ? input.journeys[journey] : undefined
    if (!object(value) || !Array.isArray(value.runs) || value.runs.length !== 3) {
      issues.push(`artifact.journeys.${journey}.runs`)
      continue
    }
    value.runs.forEach((run, index) => validateRun(run, journey, index, issues))
  }

  return issues.length
    ? { status: 'invalid', issues: [...new Set(issues)].sort() }
    : { status: 'valid', artifact: input as unknown as ComparisonArtifact }
}

function validateEnvironment(value: unknown, issues: string[]) {
  if (!object(value)) {
    issues.push('artifact.environment')
    return
  }
  for (const key of ['measuredAt', 'commit', 'buildId', 'node', 'npm', 'next', 'playwright', 'browser', 'timezone', 'network']) {
    if (!text(value[key])) issues.push(`artifact.environment.${key}`)
  }
  if (!text(value.measuredAt) || Number.isNaN(Date.parse(value.measuredAt))) issues.push('artifact.environment.measuredAt')
  if (!object(value.viewports)) {
    issues.push('artifact.environment.viewports')
    return
  }
  for (const journey of COMPARISON_JOURNEYS) {
    const viewport = value.viewports[journey]
    if (!object(viewport) || !finite(viewport.width) || !finite(viewport.height) || viewport.width === 0 || viewport.height === 0) {
      issues.push(`artifact.environment.viewports.${journey}`)
    }
  }
}

function validateBundle(value: unknown, issues: string[]) {
  if (!object(value) || !object(value.routes)) {
    issues.push('artifact.bundle.routes')
  }
  for (const route of COMPARISON_BUNDLE_ROUTES) {
    const candidate = object(value) && object(value.routes) ? value.routes[route] : undefined
    validateByteTotals(object(candidate) ? candidate.totals : undefined, `artifact.bundle.routes.${route}.totals`, issues)
    validateByteTotals(object(candidate) ? candidate.routeSpecificTotals : undefined, `artifact.bundle.routes.${route}.routeSpecificTotals`, issues)
  }
  const global = object(value) ? value.globalDeduplicated : undefined
  validateByteTotals(object(global) ? global.totals : undefined, 'artifact.bundle.globalDeduplicated.totals', issues)
}

function validateByteTotals(value: unknown, path: string, issues: string[]) {
  if (!object(value) || !finite(value.rawBytes) || !finite(value.gzipBytes)) issues.push(path)
}

function validateRun(value: unknown, journey: ComparisonJourney, index: number, issues: string[]) {
  const path = `artifact.journeys.${journey}.runs.${index}`
  if (!object(value)) {
    issues.push(path)
    return
  }
  if (value.pass !== index + 1) issues.push(`${path}.pass`)
  if (!object(value.vitals)) {
    issues.push(`${path}.vitals`)
  } else {
    for (const metric of COMPARISON_METRICS) {
      const measured = value.vitals[metric]
      if (measured !== null && !finite(measured)) issues.push(`${path}.vitals.${metric}`)
    }
    if (typeof value.vitals.eventTimingSupported !== 'boolean') issues.push(`${path}.vitals.eventTimingSupported`)
    if (!finite(value.vitals.interactionCount)) issues.push(`${path}.vitals.interactionCount`)
    if (
      value.vitals.inp !== null
      && (value.vitals.eventTimingSupported !== true
        || !finite(value.vitals.interactionCount)
        || value.vitals.interactionCount === 0)
    ) {
      issues.push(`${path}.vitals.inpObservation`)
    }
  }
  if (!object(value.requests)) {
    issues.push(`${path}.requests`)
  } else {
    if (!finite(value.requests.total)) issues.push(`${path}.requests.total`)
    if (!finite(value.requests.application)) issues.push(`${path}.requests.application`)
    if (!object(value.requests.categories)) issues.push(`${path}.requests.categories`)
    else for (const category of REQUEST_CATEGORIES) {
      if (!finite(value.requests.categories[category])) issues.push(`${path}.requests.categories.${category}`)
    }
  }
  if (!Array.isArray(value.steps) || value.steps.map(step => object(step) ? step.name : null).join('|') !== EXPECTED_STEPS[journey].join('|')) {
    issues.push(`${path}.steps`)
  }
}

export function comparisonProtocolFingerprint(artifact: ComparisonArtifact): string {
  return JSON.stringify({
    schemaVersion: artifact.schemaVersion,
    node: artifact.environment.node,
    npm: artifact.environment.npm,
    next: artifact.environment.next,
    playwright: artifact.environment.playwright,
    browser: artifact.environment.browser,
    timezone: artifact.environment.timezone,
    viewports: artifact.environment.viewports,
    network: artifact.environment.network,
    journeys: Object.fromEntries(COMPARISON_JOURNEYS.map(journey => [
      journey,
      artifact.journeys[journey].runs.map(run => run.steps.map(step => step.name)),
    ])),
  })
}
