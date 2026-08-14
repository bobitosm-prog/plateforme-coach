import {
  parseCiStabilityRegistry,
  type CiFailureClassification,
  type CiGateResult,
  type CiStabilityObservation,
} from './stability-contract.ts'

export type GithubCiJobSnapshot = {
  readonly name: string
  readonly conclusion: string | null
  readonly completed_at: string | null
  readonly steps?: readonly {
    readonly name: string
    readonly conclusion: string | null
  }[]
}

export type CollectedCiStabilityObservation = Omit<CiStabilityObservation, 'sequence' | 'record_type'> & {
  readonly record_type: 'collected_observation'
}

export type IncompleteCiStabilityCollection = {
  readonly record_type: 'incomplete_collection'
  readonly schema_version: 1
  readonly run_id: string
  readonly reason:
    | 'INVALID_RUN_METADATA'
    | 'MISSING_GATE'
    | 'NON_TERMINAL_GATE'
    | 'INVALID_DURATION'
    | 'GITHUB_API_UNAVAILABLE'
}

export type CiStabilityCollectionArtifact =
  | CollectedCiStabilityObservation
  | IncompleteCiStabilityCollection

const GATES = {
  A: 'Gate A - Fast',
  B: 'Gate B - Standard',
  C1: 'Gate C1 - Database Heavy',
  C2: 'Gate C2 - Browser Heavy',
} as const

const terminalResult = (conclusion: string | null): CiGateResult | null => {
  if (conclusion === 'success') return 'PASS'
  if (conclusion === 'failure' || conclusion === 'timed_out') return 'FAIL'
  return null
}

const failedStepName = (job: GithubCiJobSnapshot): string => (
  job.steps?.find(step => step.conclusion === 'failure' || step.conclusion === 'timed_out')?.name.toLowerCase() ?? ''
)

function classifyFailure(
  failedGate: keyof typeof GATES,
  job: GithubCiJobSnapshot,
): CiFailureClassification {
  if (job.conclusion === 'timed_out') return 'TIMEOUT'
  const step = failedStepName(job)
  if (/checkout|set up|install|infrastructure/.test(step)) return 'INFRASTRUCTURE'
  if (/cleanup|stop local|residual|audit synthetic|verify .* cleanup/.test(step)) return 'CLEANUP'
  if (failedGate === 'A') return 'TYPECHECK_LINT'
  if (failedGate === 'B') return /build/.test(step) ? 'BUILD' : 'TEST'
  if (failedGate === 'C1') return 'DATABASE'
  return 'E2E'
}

const incomplete = (
  runId: string,
  reason: IncompleteCiStabilityCollection['reason'],
): IncompleteCiStabilityCollection => ({
  record_type: 'incomplete_collection', schema_version: 1, run_id: runId, reason,
})

export function collectCiStabilityObservation(input: {
  readonly githubRunId: string
  readonly runAttempt: number
  readonly sha: string
  readonly runStartedAt: string
  readonly jobs: readonly GithubCiJobSnapshot[]
}): CiStabilityCollectionArtifact {
  const runId = `github-${input.githubRunId}-attempt-${input.runAttempt}`
  if (!/^\d+$/.test(input.githubRunId)
    || !Number.isInteger(input.runAttempt) || input.runAttempt < 1
    || !/^[0-9a-f]{40}$/.test(input.sha)
    || Number.isNaN(Date.parse(input.runStartedAt))) return incomplete(runId, 'INVALID_RUN_METADATA')

  const jobs = Object.fromEntries(Object.entries(GATES).map(([gate, name]) => [
    gate, input.jobs.find(job => job.name === name),
  ])) as Record<keyof typeof GATES, GithubCiJobSnapshot | undefined>
  if (Object.values(jobs).some(job => !job)) return incomplete(runId, 'MISSING_GATE')
  const gateResults = Object.fromEntries(Object.entries(jobs).map(([gate, job]) => [
    gate, terminalResult(job?.conclusion ?? null),
  ])) as Record<keyof typeof GATES, CiGateResult | null>
  if (Object.values(gateResults).some(result => result === null)) return incomplete(runId, 'NON_TERMINAL_GATE')

  const completedTimes = Object.values(jobs).map(job => Date.parse(job?.completed_at ?? ''))
  const startedAt = Date.parse(input.runStartedAt)
  const completedAt = Math.max(...completedTimes)
  const durationMs = completedAt - startedAt
  if (completedTimes.some(Number.isNaN) || !Number.isInteger(durationMs) || durationMs <= 0) {
    return incomplete(runId, 'INVALID_DURATION')
  }

  const gates = gateResults as Record<keyof typeof GATES, CiGateResult>
  const failedGate = (Object.keys(GATES) as (keyof typeof GATES)[]).find(gate => gates[gate] === 'FAIL')
  return {
    record_type: 'collected_observation',
    schema_version: 1,
    run_id: runId,
    sha: input.sha,
    started_at: new Date(startedAt).toISOString(),
    duration_ms: durationMs,
    result: failedGate ? 'FAIL' : 'PASS',
    rerun_of: input.runAttempt === 1 ? null : `github-${input.githubRunId}-attempt-1`,
    failure_classification: failedGate ? classifyFailure(failedGate, jobs[failedGate]!) : null,
    retry_masked: false,
    gates,
  }
}

const isCollectedObservation = (value: unknown): value is CollectedCiStabilityObservation => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Partial<CollectedCiStabilityObservation>
  return candidate.record_type === 'collected_observation' && candidate.schema_version === 1
}

export function appendCollectedCiStabilityObservation(
  registrySource: string,
  artifact: unknown,
): { readonly ok: true; readonly source: string; readonly observation: CiStabilityObservation }
  | { readonly ok: false; readonly reason: string } {
  if (!isCollectedObservation(artifact)) return { ok: false, reason: 'COLLECTION_INCOMPLETE_OR_INVALID' }
  const existing = parseCiStabilityRegistry(registrySource)
  if (existing.issues.length > 0) return { ok: false, reason: 'REGISTRY_INVALID' }
  const observation: CiStabilityObservation = {
    ...artifact,
    record_type: 'observation',
    sequence: existing.observations.length + 1,
  }
  const prefix = registrySource.endsWith('\n') ? registrySource : `${registrySource}\n`
  const source = `${prefix}${JSON.stringify(observation)}\n`
  const validated = parseCiStabilityRegistry(source)
  if (validated.issues.length > 0) return { ok: false, reason: validated.issues[0] }
  return { ok: true, source, observation }
}
