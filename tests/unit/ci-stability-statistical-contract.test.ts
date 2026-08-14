import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CI_STABILITY_FLAKY_RATE_LIMIT,
  CI_STABILITY_MINIMUM_CALENDAR_DAYS,
  CI_STABILITY_MINIMUM_COMPLETE_RUNS,
  CI_STABILITY_P95_LIMIT_MS,
  evaluateCiStability,
  nearestRank,
  parseCiStabilityRegistry,
  type CiStabilityObservation,
} from '../../lib/ci/stability-contract'

const header = '{"record_type":"registry","schema_version":1,"contract":"phase-9-ci-stability-v1"}'

const observation = (
  sequence: number,
  overrides: Partial<CiStabilityObservation> = {},
): CiStabilityObservation => {
  const day = Math.floor((sequence - 1) / 22) + 1
  return {
    record_type: 'observation',
    schema_version: 1,
    sequence,
    run_id: `run-${sequence}`,
    sha: sequence.toString(16).padStart(40, '0'),
    started_at: `2026-08-${String(day).padStart(2, '0')}T12:00:00Z`,
    duration_ms: sequence * 1_000,
    result: 'PASS',
    rerun_of: null,
    failure_classification: null,
    retry_masked: false,
    gates: { A: 'PASS', B: 'PASS', C1: 'PASS', C2: 'PASS' },
    ...overrides,
  }
}

const registry = (observations: readonly CiStabilityObservation[]) => parseCiStabilityRegistry([
  header,
  ...observations.map(item => JSON.stringify(item)),
].join('\n'))

const stableRuns = () => Array.from(
  { length: CI_STABILITY_MINIMUM_COMPLETE_RUNS },
  (_, index) => observation(index + 1),
)

describe('Phase 9 CI stability statistical contract', () => {
  it('keeps the versioned empty registry as a candidate without backfilling incomplete history', () => {
    const source = readFileSync('ci/stability/observations.jsonl', 'utf8')
    expect(evaluateCiStability(parseCiStabilityRegistry(source))).toMatchObject({
      status: 'CI_STABILITY_CANDIDATE',
      completeRunCount: 0,
      reasons: expect.arrayContaining(['MINIMUM_RUNS_NOT_MET', 'MINIMUM_DAYS_NOT_MET']),
    })
  })

  it('requires exactly 150 primary runs over seven UTC calendar dates', () => {
    expect(CI_STABILITY_MINIMUM_COMPLETE_RUNS).toBe(150)
    expect(CI_STABILITY_MINIMUM_CALENDAR_DAYS).toBe(7)
    const result = evaluateCiStability(registry(stableRuns()))
    expect(result).toMatchObject({
      status: 'CI_STABLE', completeRunCount: 150, calendarDayCount: 7,
      passCount: 150, failCount: 0, flakyCount: 0, flakyRate: 0,
    })
    expect(evaluateCiStability(registry(stableRuns().slice(1))).reasons).toContain('MINIMUM_RUNS_NOT_MET')
    const oneDay = stableRuns().map(item => ({ ...item, started_at: '2026-08-01T12:00:00Z' }))
    expect(evaluateCiStability(registry(oneDay)).reasons).toContain('MINIMUM_DAYS_NOT_MET')
  })

  it('uses nearest-rank p50 and p95 with strict duration threshold', () => {
    expect(nearestRank([40, 10, 30, 20], 50)).toBe(20)
    expect(nearestRank([40, 10, 30, 20], 95)).toBe(40)
    const result = evaluateCiStability(registry(stableRuns()))
    expect(result.p50DurationMs).toBe(75_000)
    expect(result.p95DurationMs).toBe(143_000)
    expect(CI_STABILITY_P95_LIMIT_MS).toBe(1_200_000)
    const slow = stableRuns().map((item, index) => (
      index >= 142 ? { ...item, duration_ms: CI_STABILITY_P95_LIMIT_MS } : item
    ))
    expect(evaluateCiStability(registry(slow)).reasons).toContain('P95_NOT_BELOW_LIMIT')
  })

  it('classifies flaky from the first failed result and never pads the denominator with reruns', () => {
    const roots = stableRuns()
    const firstFailures = roots.map((item, index) => index < 2 ? {
      ...item,
      result: 'FAIL' as const,
      failure_classification: 'TEST' as const,
      gates: { ...item.gates, B: 'FAIL' as const },
    } : item)
    const reruns = firstFailures.slice(0, 2).map((item, index) => observation(151 + index, {
      run_id: `rerun-${index + 1}`,
      sha: item.sha,
      started_at: `2026-08-08T0${index}:00:00Z`,
      rerun_of: item.run_id,
    }))
    const result = evaluateCiStability(registry([...firstFailures, ...reruns]))
    expect(CI_STABILITY_FLAKY_RATE_LIMIT).toBe(0.02)
    expect(result).toMatchObject({
      status: 'CI_STABLE', completeRunCount: 150, failCount: 2,
      flakyCount: 2, flakyRate: 2 / 150,
    })

    const thirdFailure = {
      ...firstFailures[2], result: 'FAIL' as const, failure_classification: 'TEST' as const,
      gates: { ...firstFailures[2].gates, B: 'FAIL' as const },
    }
    const thirdRerun = observation(153, {
      run_id: 'rerun-3', sha: thirdFailure.sha, started_at: '2026-08-08T02:00:00Z', rerun_of: thirdFailure.run_id,
    })
    const threeFlaky = [...firstFailures.slice(0, 2), thirdFailure, ...firstFailures.slice(3), ...reruns, thirdRerun]
    expect(evaluateCiStability(registry(threeFlaky)).reasons).toContain('FLAKY_RATE_NOT_BELOW_LIMIT')
  })

  it('blocks unresolved, unknown or masked failures and validates rerun identity', () => {
    const failed = {
      ...stableRuns()[0], result: 'FAIL' as const, failure_classification: 'UNKNOWN' as const,
      gates: { A: 'PASS' as const, B: 'FAIL' as const, C1: 'PASS' as const, C2: 'PASS' as const },
    }
    expect(evaluateCiStability(registry([failed, ...stableRuns().slice(1)])).reasons).toEqual(expect.arrayContaining([
      'UNRESOLVED_FAILURE_PRESENT', 'UNKNOWN_FAILURE_CLASSIFICATION_PRESENT',
    ]))

    const masked = registry(stableRuns().map((item, index) => index === 0 ? { ...item, retry_masked: true } : item))
    expect(masked.issues).toContain('run run-1: masked retry is forbidden')

    const badRerun = observation(151, {
      run_id: 'bad-rerun', sha: stableRuns()[0].sha, started_at: '2026-08-08T00:00:00Z', rerun_of: 'run-1',
    })
    expect(registry([...stableRuns(), badRerun]).issues).toContain('run bad-rerun: invalid rerun root')
  })

  it('returns immediately to candidate when the rolling window degrades', () => {
    const initial = stableRuns()
    expect(evaluateCiStability(registry(initial)).status).toBe('CI_STABLE')
    const appended = Array.from({ length: 8 }, (_, index) => observation(151 + index, {
      started_at: `2026-08-08T${String(index).padStart(2, '0')}:00:00Z`,
      duration_ms: CI_STABILITY_P95_LIMIT_MS,
    }))
    const degraded = evaluateCiStability(registry([...initial, ...appended]))
    expect(degraded.status).toBe('CI_STABILITY_CANDIDATE')
    expect(degraded.reasons).toContain('P95_NOT_BELOW_LIMIT')
  })

  it('documents append-only collection and does not claim current stability', () => {
    const contract = readFileSync('docs/CI_STABILITY_STATISTICAL_CONTRACT.md', 'utf8')
    const testingStrategy = readFileSync('docs/TESTING_STRATEGY.md', 'utf8')
    const nextRoadmap = readFileSync('docs/ROADMAP_NEXT.md', 'utf8')
    const phaseNine = readFileSync('ROADMAP_CODEX.md', 'utf8')
    expect(contract).toContain('150 runs complets primaires')
    expect(contract).toContain('7 dates calendaires UTC distinctes')
    expect(contract).toContain('nearest rank')
    expect(contract).toContain('p95 strictement inférieur')
    expect(contract).toContain('flaky rate strictement inférieur')
    expect(contract).toContain('retombe immédiatement à `CI_STABILITY_CANDIDATE`')
    expect(contract).not.toMatch(/statut (?:actuel|est) `CI_STABLE`/i)
    for (const source of [testingStrategy, nextRoadmap, phaseNine]) {
      expect(source).toContain('CI_STABILITY_STATISTICAL_CONTRACT.md')
      expect(source).toContain('150 runs')
      expect(source).toMatch(/7 (?:dates|jours)/)
    }
  })
})
