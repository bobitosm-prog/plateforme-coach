export const CI_STABILITY_MINIMUM_COMPLETE_RUNS = 150
export const CI_STABILITY_MINIMUM_CALENDAR_DAYS = 7
export const CI_STABILITY_P95_LIMIT_MS = 20 * 60 * 1000
export const CI_STABILITY_FLAKY_RATE_LIMIT = 0.02

export type CiGateResult = 'PASS' | 'FAIL'
export type CiFailureClassification =
  | 'TYPECHECK_LINT'
  | 'TEST'
  | 'BUILD'
  | 'DATABASE'
  | 'E2E'
  | 'CLEANUP'
  | 'TIMEOUT'
  | 'INFRASTRUCTURE'
  | 'CANCELLED'
  | 'UNKNOWN'

export type CiStabilityObservation = {
  readonly record_type: 'observation'
  readonly schema_version: 1
  readonly sequence: number
  readonly run_id: string
  readonly sha: string
  readonly started_at: string
  readonly duration_ms: number
  readonly result: CiGateResult
  readonly rerun_of: string | null
  readonly failure_classification: CiFailureClassification | null
  readonly retry_masked: boolean
  readonly gates: {
    readonly A: CiGateResult
    readonly B: CiGateResult
    readonly C1: CiGateResult
    readonly C2: CiGateResult
  }
}

export type CiStabilityRegistry = {
  readonly observations: readonly CiStabilityObservation[]
  readonly issues: readonly string[]
}

export type CiStabilityEvaluation = {
  readonly status: 'CI_STABLE' | 'CI_STABILITY_CANDIDATE'
  readonly completeRunCount: number
  readonly calendarDayCount: number
  readonly passCount: number
  readonly failCount: number
  readonly flakyCount: number
  readonly flakyRate: number
  readonly p50DurationMs: number | null
  readonly p95DurationMs: number | null
  readonly reasons: readonly string[]
}

const HEADER = {
  record_type: 'registry',
  schema_version: 1,
  contract: 'phase-9-ci-stability-v1',
} as const
const RESULTS = new Set<CiGateResult>(['PASS', 'FAIL'])
const FAILURE_CLASSES = new Set<CiFailureClassification>([
  'TYPECHECK_LINT', 'TEST', 'BUILD', 'DATABASE', 'E2E', 'CLEANUP',
  'TIMEOUT', 'INFRASTRUCTURE', 'CANCELLED', 'UNKNOWN',
])

const record = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort()
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index])
}

function parseObservation(value: unknown, line: number): CiStabilityObservation | string {
  const input = record(value)
  const keys = [
    'duration_ms', 'failure_classification', 'gates', 'record_type', 'rerun_of',
    'result', 'retry_masked', 'run_id', 'schema_version', 'sequence', 'sha', 'started_at',
  ]
  if (!input || !exactKeys(input, keys)) return `line ${line}: invalid observation fields`
  const gates = record(input.gates)
  if (!gates || !exactKeys(gates, ['A', 'B', 'C1', 'C2'])
    || !RESULTS.has(gates.A as CiGateResult)
    || !RESULTS.has(gates.B as CiGateResult)
    || !RESULTS.has(gates.C1 as CiGateResult)
    || !RESULTS.has(gates.C2 as CiGateResult)) return `line ${line}: incomplete A/B/C1/C2 results`
  const startedAt = typeof input.started_at === 'string' ? input.started_at : ''
  const failureClass = input.failure_classification
  if (input.record_type !== 'observation' || input.schema_version !== 1
    || !Number.isInteger(input.sequence) || Number(input.sequence) < 1
    || typeof input.run_id !== 'string' || input.run_id.length === 0
    || typeof input.sha !== 'string' || !/^[0-9a-f]{40}$/.test(input.sha)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(startedAt)
    || Number.isNaN(Date.parse(startedAt))
    || !Number.isInteger(input.duration_ms) || Number(input.duration_ms) <= 0
    || !RESULTS.has(input.result as CiGateResult)
    || !(input.rerun_of === null || (typeof input.rerun_of === 'string' && input.rerun_of.length > 0))
    || !(failureClass === null || FAILURE_CLASSES.has(failureClass as CiFailureClassification))
    || typeof input.retry_masked !== 'boolean') return `line ${line}: invalid observation values`
  const gateValues = Object.values(gates) as CiGateResult[]
  const expectedResult: CiGateResult = gateValues.every(result => result === 'PASS') ? 'PASS' : 'FAIL'
  if (input.result !== expectedResult) return `line ${line}: overall result contradicts gates`
  if ((input.result === 'PASS') !== (failureClass === null)) {
    return `line ${line}: failure classification contradicts result`
  }
  return input as CiStabilityObservation
}

export function parseCiStabilityRegistry(source: string): CiStabilityRegistry {
  const lines = source.split(/\r?\n/).filter(line => line.trim().length > 0)
  const issues: string[] = []
  if (lines.length === 0) return { observations: [], issues: ['missing registry header'] }
  let header: unknown
  try { header = JSON.parse(lines[0]) as unknown } catch { header = null }
  if (JSON.stringify(header) !== JSON.stringify(HEADER)) issues.push('invalid registry header')
  const observations: CiStabilityObservation[] = []
  for (let index = 1; index < lines.length; index += 1) {
    let parsed: unknown
    try { parsed = JSON.parse(lines[index]) as unknown } catch {
      issues.push(`line ${index + 1}: invalid JSON`)
      continue
    }
    const observation = parseObservation(parsed, index + 1)
    if (typeof observation === 'string') issues.push(observation)
    else observations.push(observation)
  }
  const byId = new Map<string, CiStabilityObservation>()
  observations.forEach((observation, index) => {
    if (observation.sequence !== index + 1) issues.push(`sequence ${observation.sequence}: expected ${index + 1}`)
    if (byId.has(observation.run_id)) issues.push(`run ${observation.run_id}: duplicate id`)
    const previous = observations[index - 1]
    if (previous && Date.parse(observation.started_at) < Date.parse(previous.started_at)) {
      issues.push(`run ${observation.run_id}: chronology is not append-only`)
    }
    if (observation.retry_masked) issues.push(`run ${observation.run_id}: masked retry is forbidden`)
    if (observation.rerun_of) {
      const root = byId.get(observation.rerun_of)
      if (!root || root.rerun_of !== null || root.sha !== observation.sha || root.result !== 'FAIL') {
        issues.push(`run ${observation.run_id}: invalid rerun root`)
      }
    }
    byId.set(observation.run_id, observation)
  })
  return { observations, issues }
}

export function nearestRank(values: readonly number[], percentile: 50 | 95): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.ceil((percentile / 100) * sorted.length) - 1]
}

function evaluationWindow(observations: readonly CiStabilityObservation[]): CiStabilityObservation[] {
  const roots = observations.filter(observation => observation.rerun_of === null)
  let start = roots.length
  const days = new Set<string>()
  while (start > 0 && (roots.length - start < CI_STABILITY_MINIMUM_COMPLETE_RUNS
    || days.size < CI_STABILITY_MINIMUM_CALENDAR_DAYS)) {
    start -= 1
    days.add(roots[start].started_at.slice(0, 10))
  }
  return roots.slice(start)
}

export function evaluateCiStability(registry: CiStabilityRegistry): CiStabilityEvaluation {
  const window = evaluationWindow(registry.observations)
  const windowIds = new Set(window.map(observation => observation.run_id))
  const reruns = registry.observations.filter(observation => (
    observation.rerun_of !== null && windowIds.has(observation.rerun_of)
  ))
  const flakyRoots = new Set(reruns.filter(observation => observation.result === 'PASS').map(item => item.rerun_of))
  const passCount = window.filter(observation => observation.result === 'PASS').length
  const failCount = window.length - passCount
  const flakyCount = flakyRoots.size
  const flakyRate = window.length === 0 ? 0 : flakyCount / window.length
  const calendarDayCount = new Set(window.map(observation => observation.started_at.slice(0, 10))).size
  const p50DurationMs = nearestRank(window.map(observation => observation.duration_ms), 50)
  const p95DurationMs = nearestRank(window.map(observation => observation.duration_ms), 95)
  const unresolvedFailures = window.filter(observation => (
    observation.result === 'FAIL' && !flakyRoots.has(observation.run_id)
  )).length
  const reasons = [...registry.issues]
  if (window.length < CI_STABILITY_MINIMUM_COMPLETE_RUNS) reasons.push('MINIMUM_RUNS_NOT_MET')
  if (calendarDayCount < CI_STABILITY_MINIMUM_CALENDAR_DAYS) reasons.push('MINIMUM_DAYS_NOT_MET')
  if (p95DurationMs === null || p95DurationMs >= CI_STABILITY_P95_LIMIT_MS) reasons.push('P95_NOT_BELOW_LIMIT')
  if (flakyRate >= CI_STABILITY_FLAKY_RATE_LIMIT) reasons.push('FLAKY_RATE_NOT_BELOW_LIMIT')
  if (unresolvedFailures > 0) reasons.push('UNRESOLVED_FAILURE_PRESENT')
  if (window.some(observation => observation.failure_classification === 'UNKNOWN')) {
    reasons.push('UNKNOWN_FAILURE_CLASSIFICATION_PRESENT')
  }
  return {
    status: reasons.length === 0 ? 'CI_STABLE' : 'CI_STABILITY_CANDIDATE',
    completeRunCount: window.length,
    calendarDayCount,
    passCount,
    failCount,
    flakyCount,
    flakyRate,
    p50DurationMs,
    p95DurationMs,
    reasons,
  }
}
