import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  RELEASE_DECISIONS,
  RELEASE_EVIDENCE_SOURCES,
  RELEASE_STATUSES,
  REQUIRED_RELEASE_EVIDENCE,
  assertSafeReleasePreflightArgs,
  evaluateReleasePreflight,
} from '../../scripts/preproduction/release-preflight.mjs'

const scriptPath = resolve(
  process.cwd(),
  'scripts/preproduction/release-preflight.mjs',
)
const capturedAt = '2026-08-06T15:00:00.000Z'
const temporaryDirectories: string[] = []

function evidence(
  name: keyof typeof RELEASE_EVIDENCE_SOURCES = 'unitTests',
  status = 'PASS',
) {
  return {
    status,
    durationMs: 100,
    source: RELEASE_EVIDENCE_SOURCES[name],
    capturedAt,
  }
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    branch: 'phase-6-staging',
    headSha: 'c71c241',
    expectedSha: 'c71c241',
    worktreeClean: true,
    divergenceLeft: 0,
    divergenceRight: 0,
    migrationAlignmentVerdict: 'ALIGNED',
    requiredEvidence: [...REQUIRED_RELEASE_EVIDENCE],
    environment: 'local',
    vercelEnvironment: 'development',
    stripeMode: 'test',
    productionAuthorized: false,
    results: Object.fromEntries(
      REQUIRED_RELEASE_EVIDENCE.map(name => [
        name,
        evidence(name as keyof typeof RELEASE_EVIDENCE_SOURCES),
      ]),
    ),
    ...overrides,
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('Phase 9 release preflight', () => {
  it('accepts a synthetic local candidate as ready for Preview', () => {
    expect(evaluateReleasePreflight(validInput())).toEqual({
      status: RELEASE_STATUSES.readyForPreview,
      decision: RELEASE_DECISIONS.go,
      candidateSha: 'c71c241',
      blockingReasons: [],
      warnings: ['HUMAN_APPROVAL_REQUIRED', 'CI_STABILITY_NOT_ATTESTED'],
      gates: {
        localEvidence: true,
        migrationAlignment: true,
        productionExcluded: true,
      },
      evidenceSummary: {
        required: 11,
        passed: 11,
        failed: 0,
        missing: 0,
        skipped: 0,
      },
    })
  })

  it('marks an attested Preview candidate as Preview validated', () => {
    const report = evaluateReleasePreflight(validInput({
      environment: 'preview',
      vercelEnvironment: 'preview',
    }))
    expect(report).toMatchObject({
      status: RELEASE_STATUSES.previewValidated,
      decision: RELEASE_DECISIONS.go,
    })
  })

  it.each([
    'HISTORY_AND_STRUCTURE_DRIFT',
    'MISSING_REMOTE_VERSIONS',
  ])('returns NO_GO for migration verdict %s', migrationAlignmentVerdict => {
    const report = evaluateReleasePreflight(validInput({ migrationAlignmentVerdict }))
    expect(report.decision).toBe(RELEASE_DECISIONS.noGo)
    expect(report.blockingReasons).toContain(
      `MIGRATION_ALIGNMENT_${migrationAlignmentVerdict}`,
    )
  })

  it('returns NO_GO for a dirty worktree', () => {
    expect(evaluateReleasePreflight(validInput({ worktreeClean: false })))
      .toMatchObject({ decision: RELEASE_DECISIONS.noGo, blockingReasons: ['WORKTREE_NOT_CLEAN'] })
  })

  it('returns NO_GO for Git divergence', () => {
    expect(evaluateReleasePreflight(validInput({ divergenceRight: 1 })))
      .toMatchObject({ decision: RELEASE_DECISIONS.noGo, blockingReasons: ['GIT_DIVERGENCE'] })
  })

  it('returns NO_GO when HEAD differs from the candidate', () => {
    expect(evaluateReleasePreflight(validInput({ headSha: 'a4318d3' })))
      .toMatchObject({ decision: RELEASE_DECISIONS.noGo, blockingReasons: ['CANDIDATE_SHA_MISMATCH'] })
  })

  it('returns NO_GO for a branch outside the release contract', () => {
    expect(evaluateReleasePreflight(validInput({ branch: 'main' })))
      .toMatchObject({ decision: RELEASE_DECISIONS.noGo, blockingReasons: ['BRANCH_NOT_ALLOWED'] })
  })

  it('returns NO_GO when mandatory evidence is missing', () => {
    const input = validInput()
    delete input.results.unitTests
    const report = evaluateReleasePreflight(input)
    expect(report.decision).toBe(RELEASE_DECISIONS.noGo)
    expect(report.blockingReasons).toEqual(['EVIDENCE_MISSING:unitTests'])
  })

  it.each(['FAIL', 'MISSING', 'SKIPPED'])('returns NO_GO for mandatory evidence status %s', status => {
    const input = validInput()
    input.results.build = evidence('build', status)
    const report = evaluateReleasePreflight(input)
    expect(report.decision).toBe(RELEASE_DECISIONS.noGo)
    expect(report.blockingReasons).toEqual([`EVIDENCE_${status}:build`])
  })

  it('blocks Production without explicit authorization', () => {
    const report = evaluateReleasePreflight(validInput({ environment: 'production' }))
    expect(report.decision).toBe(RELEASE_DECISIONS.blocked)
    expect(report.blockingReasons).toContain('PRODUCTION_AUTHORIZATION_REQUIRED')
  })

  it('blocks VERCEL_ENV production', () => {
    const report = evaluateReleasePreflight(validInput({ vercelEnvironment: 'production' }))
    expect(report.decision).toBe(RELEASE_DECISIONS.blocked)
    expect(report.blockingReasons).toContain('VERCEL_PRODUCTION_FORBIDDEN')
  })

  it.each([
    [['--prod', '--input', '/tmp/proof.json'], /--prod is forbidden/],
    [['--linked', '--input', '/tmp/proof.json'], /--linked is forbidden/],
    [['--input', 'https://staging.invalid/proof.json'], /explicit local file/],
  ] as const)('refuses unsafe CLI arguments %j', (args, expectedError) => {
    expect(() => assertSafeReleasePreflightArgs([...args])).toThrow(expectedError)
  })

  it('blocks Stripe live mode', () => {
    const report = evaluateReleasePreflight(validInput({ stripeMode: 'live' }))
    expect(report.decision).toBe(RELEASE_DECISIONS.blocked)
    expect(report.blockingReasons).toContain('STRIPE_LIVE_FORBIDDEN')
  })

  it('blocks an unexpected Production URL without returning it', () => {
    const input = validInput()
    ;(input.results.build as { source: string }).source =
      'https://app.moovx.ch/build'
    const serialized = JSON.stringify(evaluateReleasePreflight(input))
    expect(serialized).toContain('PRODUCTION_REFERENCE_FORBIDDEN')
    expect(serialized).not.toContain('app.moovx.ch')
  })

  it('blocks synthetic secret material without returning it', () => {
    const report = evaluateReleasePreflight({
      ...validInput(),
      apiKey: 'synthetic-sensitive-value',
    })
    const serialized = JSON.stringify(report)
    expect(report.decision).toBe(RELEASE_DECISIONS.blocked)
    expect(report.blockingReasons).toContain('SECRET_MATERIAL_DETECTED')
    expect(serialized).not.toContain('synthetic-sensitive-value')
    expect(serialized).not.toContain('apiKey')
  })

  it('blocks a malformed report', () => {
    expect(evaluateReleasePreflight({ branch: 'phase-6-staging' }))
      .toMatchObject({ status: RELEASE_STATUSES.blocked, decision: RELEASE_DECISIONS.blocked })
  })

  it.each([
    [{ durationMs: -1 }, 'INVALID_EVIDENCE_DURATION:unitTests'],
    [{ capturedAt: 'not-a-date' }, 'INVALID_EVIDENCE_CAPTURED_AT:unitTests'],
  ])('blocks malformed evidence %j', (override, expectedReason) => {
    const input = validInput()
    input.results.unitTests = { ...evidence('unitTests'), ...override }
    expect(evaluateReleasePreflight(input).blockingReasons).toContain(expectedReason)
  })

  it('returns only the bounded redacted report contract', () => {
    const report = evaluateReleasePreflight(validInput())
    expect(Object.keys(report)).toEqual([
      'status',
      'decision',
      'candidateSha',
      'blockingReasons',
      'warnings',
      'gates',
      'evidenceSummary',
    ])
    expect(JSON.stringify(report)).not.toContain('npm-test')
    expect(JSON.stringify(report)).not.toContain(capturedAt)
  })

  it('does not import network or process execution clients', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/node:(?:http|https|net|tls|child_process)/)
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|spawn|execSync|spawnSync)\s*\(/)
  })

  it('does not mutate its input', () => {
    const input = validInput()
    const before = JSON.stringify(input)
    evaluateReleasePreflight(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it('keeps blocking reasons in deterministic contract order', () => {
    const input = validInput({
      branch: 'other',
      worktreeClean: false,
      divergenceLeft: 1,
      headSha: 'a4318d3',
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
    })
    input.results.unitTests = evidence('unitTests', 'FAIL')
    expect(evaluateReleasePreflight(input).blockingReasons).toEqual([
      'EVIDENCE_FAIL:unitTests',
      'BRANCH_NOT_ALLOWED',
      'WORKTREE_NOT_CLEAN',
      'GIT_DIVERGENCE',
      'CANDIDATE_SHA_MISMATCH',
      'MIGRATION_ALIGNMENT_HISTORY_AND_STRUCTURE_DRIFT',
    ])
  })

  it('runs the CLI only from an explicit local JSON file and exits zero only for GO', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-release-preflight-'))
    temporaryDirectories.push(directory)
    const inputPath = join(directory, 'preflight.json')
    writeFileSync(inputPath, JSON.stringify(validInput()))
    const accepted = spawnSync(process.execPath, [scriptPath, '--input', inputPath], {
      encoding: 'utf8',
    })
    expect(accepted.status).toBe(0)
    expect(JSON.parse(accepted.stdout)).toMatchObject({
      status: RELEASE_STATUSES.readyForPreview,
      decision: RELEASE_DECISIONS.go,
    })

    writeFileSync(inputPath, JSON.stringify(validInput({
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
    })))
    const refused = spawnSync(process.execPath, [scriptPath, '--input', inputPath], {
      encoding: 'utf8',
    })
    expect(refused.status).toBe(1)
    expect(JSON.parse(refused.stdout).decision).toBe(RELEASE_DECISIONS.noGo)
  })
})
