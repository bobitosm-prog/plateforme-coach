import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  appendCollectedCiStabilityObservation,
  collectCiStabilityObservation,
  validateCiObservationIdentity,
  type GithubCiJobSnapshot,
} from '../../lib/ci/stability-collection'
import { evaluateCiStability, parseCiStabilityRegistry } from '../../lib/ci/stability-contract'

const header = '{"record_type":"registry","schema_version":1,"contract":"phase-9-ci-stability-v1"}\n'
const observedSha = 'a'.repeat(40)
const executionSha = 'b'.repeat(40)
const baseSha = 'c'.repeat(40)

const jobs = (override: Partial<Record<'A' | 'B' | 'C1' | 'C2', Partial<GithubCiJobSnapshot>>> = {}) => {
  const definitions = {
    A: { name: 'Gate A - Fast', conclusion: 'success', completed_at: '2026-08-14T10:04:00Z' },
    B: { name: 'Gate B - Standard', conclusion: 'success', completed_at: '2026-08-14T10:08:00Z' },
    C1: { name: 'Gate C1 - Database Heavy', conclusion: 'success', completed_at: '2026-08-14T10:12:00Z' },
    C2: { name: 'Gate C2 - Browser Heavy', conclusion: 'success', completed_at: '2026-08-14T10:16:00Z' },
  } as const
  return (Object.keys(definitions) as (keyof typeof definitions)[]).map(gate => ({
    ...definitions[gate], ...override[gate],
  }))
}

const collect = (overrides: Partial<Parameters<typeof collectCiStabilityObservation>[0]> = {}) => (
  collectCiStabilityObservation({
    githubRunId: '40000000001',
    runAttempt: 1,
    executionSha,
    observedSha,
    baseSha,
    runStartedAt: '2026-08-14T10:00:00Z',
    jobs: jobs(),
    ...overrides,
  })
)

describe('CI stability observation collection', () => {
  it('collects a complete primary PASS with the four terminal gates and wall duration', () => {
    expect(collect()).toEqual({
      record_type: 'collected_observation',
      schema_version: 1,
      observation_contract_version: 2,
      run_id: 'github-40000000001-attempt-1',
      sha: observedSha,
      execution_sha: executionSha,
      base_sha: baseSha,
      started_at: '2026-08-14T10:00:00.000Z',
      duration_ms: 16 * 60 * 1_000,
      result: 'PASS',
      rerun_of: null,
      failure_classification: null,
      retry_masked: false,
      gates: { A: 'PASS', B: 'PASS', C1: 'PASS', C2: 'PASS' },
    })
  })

  it('collects a complete primary FAIL with a durable failure classification', () => {
    expect(collect({
      jobs: jobs({ B: {
        conclusion: 'failure',
        steps: [{ name: 'Build application', conclusion: 'failure' }],
      } }),
    })).toMatchObject({
      result: 'FAIL',
      rerun_of: null,
      failure_classification: 'BUILD',
      gates: { A: 'PASS', B: 'FAIL', C1: 'PASS', C2: 'PASS' },
    })
  })

  it('collects uniquely prefixed reusable-workflow gate jobs without weakening gate identity', () => {
    const prefixedJobs = jobs().map(job => ({ ...job, name: `scheduled-observation / ${job.name}` }))
    expect(collect({ jobs: prefixedJobs })).toMatchObject({
      record_type: 'collected_observation',
      sha: observedSha,
      gates: { A: 'PASS', B: 'PASS', C1: 'PASS', C2: 'PASS' },
    })
    expect(collect({ jobs: [...prefixedJobs, prefixedJobs[0]] })).toEqual({
      record_type: 'incomplete_collection',
      schema_version: 1,
      run_id: 'github-40000000001-attempt-1',
      reason: 'MISSING_GATE',
    })
  })

  it('appends a same-SHA rerun separately without changing primary statistics', () => {
    const primary = collect({ jobs: jobs({ B: { conclusion: 'failure' } }) })
    const firstAppend = appendCollectedCiStabilityObservation(header, primary)
    expect(firstAppend.ok).toBe(true)
    if (!firstAppend.ok) throw new Error('primary append expected')
    const rerun = collect({
      runAttempt: 2,
      runStartedAt: '2026-08-14T11:00:00Z',
      jobs: jobs({
        A: { completed_at: '2026-08-14T11:04:00Z' },
        B: { completed_at: '2026-08-14T11:08:00Z' },
        C1: { completed_at: '2026-08-14T11:12:00Z' },
        C2: { completed_at: '2026-08-14T11:16:00Z' },
      }),
    })
    const secondAppend = appendCollectedCiStabilityObservation(firstAppend.source, rerun)
    expect(secondAppend.ok).toBe(true)
    if (!secondAppend.ok) throw new Error('rerun append expected')
    expect(secondAppend.observation).toMatchObject({
      sequence: 2,
      run_id: 'github-40000000001-attempt-2',
      rerun_of: 'github-40000000001-attempt-1',
      sha: observedSha,
    })
    const evaluation = evaluateCiStability(parseCiStabilityRegistry(secondAppend.source))
    expect(evaluation).toMatchObject({
      completeRunCount: 1,
      flakyCount: 1,
      p50DurationMs: 16 * 60 * 1_000,
      p95DurationMs: 16 * 60 * 1_000,
    })
  })

  it('rejects a rerun with a different SHA', () => {
    const primary = collect({ jobs: jobs({ C1: { conclusion: 'failure' } }) })
    const firstAppend = appendCollectedCiStabilityObservation(header, primary)
    if (!firstAppend.ok) throw new Error('primary append expected')
    const foreignRerun = collect({ runAttempt: 2, observedSha: 'd'.repeat(40) })
    expect(appendCollectedCiStabilityObservation(firstAppend.source, foreignRerun)).toEqual({
      ok: false,
      reason: 'run github-40000000001-attempt-2: invalid rerun root',
    })
  })

  it('preserves every byte of existing history and only appends one line', () => {
    const artifact = collect()
    const appended = appendCollectedCiStabilityObservation(header, artifact)
    expect(appended.ok).toBe(true)
    if (!appended.ok) throw new Error('append expected')
    expect(appended.source.startsWith(header)).toBe(true)
    expect(appended.source.slice(header.length).split('\n').filter(Boolean)).toHaveLength(1)
  })

  it('validates direct and reusable execution identities independently from observed code', () => {
    const identity = {
      executionSha,
      githubSha: executionSha,
      apiHeadSha: executionSha,
      observedSha,
      workingTreeSha: observedSha,
      stagingHeadSha: observedSha,
      baseSha,
      observedCommitExists: true,
      baseCommitExists: true,
      baseIsAncestor: true,
    }
    expect(validateCiObservationIdentity({
      ...identity,
      executionSha: observedSha,
      githubSha: observedSha,
      apiHeadSha: observedSha,
    })).toBe(true)
    expect(validateCiObservationIdentity(identity)).toBe(true)
    expect(validateCiObservationIdentity({ ...identity, executionSha: 'invalid' })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, githubSha: 'd'.repeat(40) })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, apiHeadSha: 'd'.repeat(40) })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, workingTreeSha: 'd'.repeat(40) })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, stagingHeadSha: 'd'.repeat(40) })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, observedSha: 'invalid' })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, baseSha: 'invalid' })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, observedCommitExists: false })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, baseCommitExists: false })).toBe(false)
    expect(validateCiObservationIdentity({ ...identity, baseIsAncestor: false })).toBe(false)
    expect(collect({ observedSha: 'invalid' })).toMatchObject({
      record_type: 'incomplete_collection', reason: 'INVALID_RUN_METADATA',
    })
    expect(collect({ baseSha: 'invalid' })).toMatchObject({
      record_type: 'incomplete_collection', reason: 'INVALID_RUN_METADATA',
    })
  })

  it('imports historical V1 artifacts while emitting auditable V2 artifacts', () => {
    const v1Artifact = {
      record_type: 'collected_observation',
      schema_version: 1,
      run_id: 'github-39999999999-attempt-1',
      sha: observedSha,
      started_at: '2026-08-14T09:00:00.000Z',
      duration_ms: 60_000,
      result: 'PASS',
      rerun_of: null,
      failure_classification: null,
      retry_masked: false,
      gates: { A: 'PASS', B: 'PASS', C1: 'PASS', C2: 'PASS' },
    }
    const appendedV1 = appendCollectedCiStabilityObservation(header, v1Artifact)
    expect(appendedV1.ok).toBe(true)
    if (!appendedV1.ok) throw new Error('V1 artifact append expected')
    const appendedV2 = appendCollectedCiStabilityObservation(appendedV1.source, collect({
      runStartedAt: '2026-08-14T10:00:00Z',
    }))
    expect(appendedV2.ok).toBe(true)
    if (!appendedV2.ok) throw new Error('V2 artifact append expected')
    expect(appendedV2.observation).toMatchObject({
      sha: observedSha,
      observation_contract_version: 2,
      execution_sha: executionSha,
      base_sha: baseSha,
    })
    expect(evaluateCiStability(parseCiStabilityRegistry(appendedV2.source)).completeRunCount).toBe(2)
  })

  it('fails closed for incomplete collection and never creates a registry observation', () => {
    const incomplete = collect({ jobs: jobs().slice(0, 3) })
    expect(incomplete).toMatchObject({ record_type: 'incomplete_collection', reason: 'MISSING_GATE' })
    expect(appendCollectedCiStabilityObservation(header, incomplete)).toEqual({
      ok: false, reason: 'COLLECTION_INCOMPLETE_OR_INVALID',
    })
  })

  it('keeps persistence as an explicit local append with no commit or push', () => {
    const importer = readFileSync('scripts/import-ci-stability-observation.ts', 'utf8')
    expect(importer).toContain("appendFileSync(registryPath, appended.source.slice(current.length)")
    expect(importer).not.toMatch(/writeFileSync|renameSync|git (?:add|commit|push)/)
    expect(importer).toContain('--confirm-append')
  })
})
