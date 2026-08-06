import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  REQUIRED_ROLLBACK_EVIDENCE,
  REQUIRED_SMOKE_TESTS,
  ROLLBACK_DECISIONS,
  ROLLBACK_EVIDENCE_SOURCES,
  ROLLBACK_STATUSES,
  ROLLBACK_TIMING_CONTRACT,
  assertSafeRollbackPreflightArgs,
  evaluateRollbackPreflight,
} from '../../scripts/preproduction/rollback-preflight.mjs'

const scriptPath = resolve(
  process.cwd(),
  'scripts/preproduction/rollback-preflight.mjs',
)
const capturedAt = '2026-08-06T18:00:00.000Z'
const temporaryDirectories: string[] = []

function proof(name: keyof typeof ROLLBACK_EVIDENCE_SOURCES, status = 'PASS') {
  return {
    status,
    source: ROLLBACK_EVIDENCE_SOURCES[name],
    capturedAt,
  }
}

function validLocalInput(overrides: Record<string, unknown> = {}) {
  return {
    environment: 'local',
    branch: 'phase-6-staging',
    incidentSha: '657313d',
    healthySha: '3285244',
    incidentArtifactId: 'local-artifact-incident',
    healthyArtifactId: 'local-artifact-healthy',
    artifactImmutabilityVerified: true,
    servedShaBefore: '657313d',
    migrationAlignmentVerdict: 'LOCAL_NOT_REQUIRED',
    schemaCompatibility: 'LOCAL_REBUILT_COMPATIBLE',
    releaseCandidate: {
      incidentArtifactSha: '657313d',
      healthyArtifactSha: '3285244',
    },
    approvals: { operator: true, approver: true, timer: true },
    backupCapability: { required: false, attested: false },
    requiredSmokeTests: [...REQUIRED_SMOKE_TESTS],
    evidence: Object.fromEntries(
      REQUIRED_ROLLBACK_EVIDENCE.map(name => [
        name,
        proof(
          name as keyof typeof ROLLBACK_EVIDENCE_SOURCES,
          name === 'migrationAlignment' ? 'NOT_APPLICABLE' : 'PASS',
        ),
      ]),
    ),
    stripeMode: 'test',
    requestedCommands: ['npm run build', 'npm run test:e2e:critical'],
    productionAuthorized: false,
    startedAt: capturedAt,
    ...overrides,
  }
}

function validPreviewInput(overrides: Record<string, unknown> = {}) {
  const input = validLocalInput({
    environment: 'preview',
    migrationAlignmentVerdict: 'ALIGNED',
    schemaCompatibility: 'COMPATIBLE',
    ...overrides,
  })
  input.evidence.migrationAlignment = proof('migrationAlignment')
  return input
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('Phase 9 rollback preflight', () => {
  it('accepts a valid isolated local rehearsal', () => {
    expect(evaluateRollbackPreflight(validLocalInput())).toMatchObject({
      status: ROLLBACK_STATUSES.readyForRehearsal,
      decision: ROLLBACK_DECISIONS.ready,
      blockingReasons: [],
      rollbackTarget: {
        environment: 'local',
        healthySha: '3285244',
        healthyArtifactIdPresent: true,
      },
    })
  })

  it('returns NO_GO for Preview with the current staging drift', () => {
    expect(evaluateRollbackPreflight(validPreviewInput({
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
    }))).toMatchObject({
      decision: ROLLBACK_DECISIONS.noGo,
      blockingReasons: ['MIGRATION_ALIGNMENT_NOT_ALIGNED'],
    })
  })

  it('returns NO_GO when Preview migration alignment is missing', () => {
    expect(evaluateRollbackPreflight(validPreviewInput({
      migrationAlignmentVerdict: null,
    })).blockingReasons).toContain('MIGRATION_ALIGNMENT_NOT_ALIGNED')
  })

  it('returns NO_GO when schema compatibility is unproven', () => {
    expect(evaluateRollbackPreflight(validPreviewInput({
      schemaCompatibility: 'UNKNOWN',
    })).blockingReasons).toContain('SCHEMA_COMPATIBILITY_UNPROVEN')
  })

  it('returns NO_GO when the healthy artifact is absent', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      healthyArtifactId: '',
    })).blockingReasons).toContain('HEALTHY_ARTIFACT_MISSING')
  })

  it('returns NO_GO when the healthy artifact is not immutable', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      artifactImmutabilityVerified: false,
    })).blockingReasons).toContain('HEALTHY_ARTIFACT_NOT_IMMUTABLE')
  })

  it('returns NO_GO for identical incident and healthy SHAs', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      healthySha: '657313d',
      releaseCandidate: {
        incidentArtifactSha: '657313d',
        healthyArtifactSha: '657313d',
      },
    })).blockingReasons).toContain('INCIDENT_AND_HEALTHY_ARTIFACT_EQUAL')
  })

  it('returns NO_GO for identical incident and healthy artifacts', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      healthyArtifactId: 'local-artifact-incident',
    })).blockingReasons).toContain('INCIDENT_AND_HEALTHY_ARTIFACT_EQUAL')
  })

  it('returns NO_GO when an artifact does not match its SHA', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      releaseCandidate: {
        incidentArtifactSha: '657313d',
        healthyArtifactSha: 'f283175',
      },
    })).blockingReasons).toContain('GIT_SHA_MISMATCH')
  })

  it('returns NO_GO when the served SHA does not match the incident artifact', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      servedShaBefore: 'f283175',
    })).blockingReasons).toContain('GIT_SHA_MISMATCH')
  })

  it('returns BLOCKED when an approval role is missing', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      approvals: { operator: true, approver: false, timer: true },
    }))).toMatchObject({
      decision: ROLLBACK_DECISIONS.blocked,
      blockingReasons: ['APPROVAL_MISSING'],
    })
  })

  it('blocks Production without separate authorization', () => {
    expect(evaluateRollbackPreflight(validPreviewInput({
      environment: 'production',
      productionAuthorized: false,
    })).blockingReasons).toContain('PRODUCTION_AUTHORIZATION_REQUIRED')
  })

  it.each([
    [['--prod', '--input', '/tmp/proof.json'], /--prod is forbidden/],
    [['--linked', '--input', '/tmp/proof.json'], /--linked is forbidden/],
    [['--input', 'https://preview.invalid/proof.json'], /explicit local file/],
  ] as const)('refuses unsafe CLI arguments %j', (args, expectedError) => {
    expect(() => assertSafeRollbackPreflightArgs([...args])).toThrow(expectedError)
  })

  it.each([
    ['git push --force origin phase-6-staging'],
    ['git reset --hard HEAD^'],
    ['npx supabase db push'],
    ['npx supabase migration repair 123 --status applied'],
    ['npx supabase db reset --linked'],
    ['git rm supabase/migrations/20260806100000_example.sql'],
    ['sed -i old new supabase/migrations/20260806100000_example.sql'],
    ['psql -c "DROP TABLE public.payments"'],
  ])('blocks unsafe requested command: %s', command => {
    expect(evaluateRollbackPreflight(validLocalInput({
      requestedCommands: [command],
    }))).toMatchObject({
      decision: ROLLBACK_DECISIONS.blocked,
      blockingReasons: ['UNSAFE_COMMAND_DETECTED'],
    })
  })

  it('blocks Stripe live mode', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      stripeMode: 'live',
    })).blockingReasons).toContain('LIVE_STRIPE_DETECTED')
  })

  it('blocks secret material without returning it', () => {
    const input = { ...validLocalInput(), apiKey: 'synthetic-sensitive-value' }
    const result = evaluateRollbackPreflight(input)
    const serialized = JSON.stringify(result)
    expect(result.decision).toBe(ROLLBACK_DECISIONS.blocked)
    expect(result.blockingReasons).toContain('SECRET_DETECTED')
    expect(serialized).not.toContain('synthetic-sensitive-value')
    expect(serialized).not.toContain('apiKey')
  })

  it('blocks a data restoration without attested backup capability', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      backupCapability: { required: true, attested: false },
    }))).toMatchObject({
      decision: ROLLBACK_DECISIONS.blocked,
      blockingReasons: ['BACKUP_CAPABILITY_UNPROVEN'],
    })
  })

  it('returns NO_GO when required smoke tests are missing', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      requiredSmokeTests: REQUIRED_SMOKE_TESTS.slice(0, -1),
    })).blockingReasons).toContain('REQUIRED_SMOKE_TESTS_MISSING')
  })

  it('returns NO_GO when mandatory evidence is missing', () => {
    const input = validLocalInput()
    delete input.evidence.cleanupPlan
    expect(evaluateRollbackPreflight(input).blockingReasons)
      .toContain('REQUIRED_EVIDENCE_MISSING')
  })

  it('blocks an invalid evidence timestamp', () => {
    const input = validLocalInput()
    input.evidence.timingPlan = { ...proof('timingPlan'), capturedAt: 'invalid' }
    expect(evaluateRollbackPreflight(input)).toMatchObject({
      decision: ROLLBACK_DECISIONS.blocked,
      blockingReasons: ['REPORT_INVALID'],
    })
  })

  it('blocks a malformed report', () => {
    expect(evaluateRollbackPreflight({ environment: 'local' })).toMatchObject({
      status: ROLLBACK_STATUSES.blocked,
      decision: ROLLBACK_DECISIONS.blocked,
    })
  })

  it('returns only an explicitly redacted report', () => {
    const serialized = JSON.stringify(evaluateRollbackPreflight(validLocalInput()))
    expect(serialized).not.toContain('requestedCommands')
    expect(serialized).not.toContain('release-candidate-record')
    expect(serialized).not.toContain(capturedAt)
    expect(serialized).not.toContain('local-artifact-healthy')
  })

  it('keeps blocking reasons in deterministic contract order', () => {
    const input = validPreviewInput({
      healthyArtifactId: '',
      artifactImmutabilityVerified: false,
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
      schemaCompatibility: 'UNKNOWN',
      requiredSmokeTests: [],
    })
    expect(evaluateRollbackPreflight(input).blockingReasons).toEqual([
      'HEALTHY_ARTIFACT_MISSING',
      'HEALTHY_ARTIFACT_NOT_IMMUTABLE',
      'MIGRATION_ALIGNMENT_NOT_ALIGNED',
      'SCHEMA_COMPATIBILITY_UNPROVEN',
      'REQUIRED_SMOKE_TESTS_MISSING',
    ])
  })

  it('does not import a network or process execution client', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/node:(?:http|https|net|tls|child_process)/)
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|spawn|execSync|spawnSync)\s*\(/)
  })

  it('does not read process.env or load dotenv files', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/process\.env|dotenv|\.env(?:\W|$)/)
  })

  it('exposes the complete timing contract including platform wait and smoke tests', () => {
    expect(ROLLBACK_TIMING_CONTRACT).toEqual({
      startsAt: 'ROLLBACK_REQUIRED_APPROVED',
      endsAt: 'HEALTHY_ARTIFACT_READY_SHA_CONFIRMED_SMOKE_TESTS_PASS_JOURNAL_RECORDED',
      segments: [
        'decisionMs',
        'preflightMs',
        'actionMs',
        'platformWaitMs',
        'validationMs',
        'totalMs',
      ],
      targetTotalMsExclusive: 1_800_000,
      platformWaitAndSmokeTestsIncluded: true,
    })
  })

  it('does not require remote alignment for isolated local rehearsal', () => {
    expect(evaluateRollbackPreflight(validLocalInput({
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
    })).decision).toBe(ROLLBACK_DECISIONS.ready)
  })

  it('requires ALIGNED for Preview', () => {
    expect(evaluateRollbackPreflight(validPreviewInput({
      migrationAlignmentVerdict: 'MISSING_REMOTE_VERSIONS',
    })).decision).toBe(ROLLBACK_DECISIONS.noGo)
  })

  it('requires separate Production authorization even with all other proofs green', () => {
    const result = evaluateRollbackPreflight(validPreviewInput({
      environment: 'production',
      productionAuthorized: false,
    }))
    expect(result).toMatchObject({
      decision: ROLLBACK_DECISIONS.blocked,
      blockingReasons: ['PRODUCTION_AUTHORIZATION_REQUIRED'],
    })
  })

  it('runs the CLI from a local JSON file and exits zero only for READY', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-rollback-preflight-'))
    temporaryDirectories.push(directory)
    const inputPath = join(directory, 'preflight.json')
    writeFileSync(inputPath, JSON.stringify(validLocalInput()))
    const ready = spawnSync(process.execPath, [scriptPath, '--input', inputPath], {
      encoding: 'utf8',
    })
    expect(ready.status).toBe(0)
    expect(JSON.parse(ready.stdout)).toMatchObject({
      status: ROLLBACK_STATUSES.readyForRehearsal,
      decision: ROLLBACK_DECISIONS.ready,
    })

    writeFileSync(inputPath, JSON.stringify(validPreviewInput({
      migrationAlignmentVerdict: 'HISTORY_AND_STRUCTURE_DRIFT',
    })))
    const noGo = spawnSync(process.execPath, [scriptPath, '--input', inputPath], {
      encoding: 'utf8',
    })
    expect(noGo.status).toBe(1)
    expect(JSON.parse(noGo.stdout).decision).toBe(ROLLBACK_DECISIONS.noGo)
  })

  it('does not mutate its input', () => {
    const input = validLocalInput()
    const before = JSON.stringify(input)
    evaluateRollbackPreflight(input)
    expect(JSON.stringify(input)).toBe(before)
  })
})
