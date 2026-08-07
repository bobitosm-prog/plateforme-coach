import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildExpectedStagingAlignmentPlan } from '../../scripts/preproduction/compare-staging-migration-alignment.mjs'
import {
  EXPECTED_STAGING_INITIAL_STATE,
  EXPECTED_STAGING_MISSING_VERSIONS,
  STAGING_REMEDIATION_DECISIONS,
  assertSafeRemediationArgs,
  prepareStagingMigrationRemediation,
} from '../../scripts/preproduction/prepare-staging-migration-remediation.mjs'

const repositoryRoot = process.cwd()
const scriptPath = resolve(
  repositoryRoot,
  'scripts/preproduction/prepare-staging-migration-remediation.mjs',
)
const manifest = JSON.parse(readFileSync(
  resolve(repositoryRoot, 'scripts/preproduction/staging-migration-manifest.json'),
  'utf8',
))
const expectedPlan = buildExpectedStagingAlignmentPlan({
  migrationManifest: manifest,
  repositoryRoot,
  structureInventory: undefined,
})

function inventory(overrides: Record<string, unknown> = {}) {
  return {
    projectRef: 'cycbnnojcymjnaqomlyj',
    capturedAt: '2026-08-06T13:58:20.241Z',
    source: 'operator-read-only',
    versions: expectedPlan.expectedVersions.filter(
      (version: string) => !EXPECTED_STAGING_MISSING_VERSIONS.includes(version),
    ),
    structure: { ...EXPECTED_STAGING_INITIAL_STATE },
    ...overrides,
  }
}

function prepare(
  candidate: Record<string, unknown> = inventory(),
  migrationManifest = manifest,
) {
  return prepareStagingMigrationRemediation({
    migrationManifest,
    inventory: candidate,
    repositoryRoot,
  })
}

describe('staging migration remediation preparation', () => {
  it('returns READY only for the exact four-version drift', () => {
    expect(prepare()).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.ready,
      expectedStagingVersionCount: 145,
      observedStagingVersionCount: 141,
      missingVersions: EXPECTED_STAGING_MISSING_VERSIONS,
      extraVersionCount: 0,
      duplicateVersionCount: 0,
      orderMismatchCount: 0,
      initialStructureVerified: true,
      remoteAccess: false,
      mutationExecuted: false,
      reasons: [],
    }))
  })

  it('produces the deterministic chronological order and pinned hashes', () => {
    const report = prepare()
    expect(report.steps.map((step: { version: string }) => step.version))
      .toEqual(EXPECTED_STAGING_MISSING_VERSIONS)
    expect(report.steps.map((step: { sequence: number }) => step.sequence))
      .toEqual([1, 2, 3, 4])
    expect(report.steps.every((step: { sourceSha256: string }) =>
      /^[a-f0-9]{64}$/.test(step.sourceSha256))).toBe(true)
  })

  it('blocks an extra version', () => {
    const candidate = inventory()
    ;(candidate.versions as string[]).push('20990101000000')
    expect(prepare(candidate)).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['EXTRA_VERSION_PRESENT']),
    }))
  })

  it('blocks another missing version', () => {
    const candidate = inventory()
    ;(candidate.versions as string[]).splice(10, 1)
    expect(prepare(candidate)).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['MISSING_VERSION_SET_UNEXPECTED']),
    }))
  })

  it('blocks a duplicate version', () => {
    const candidate = inventory()
    ;(candidate.versions as string[]).push((candidate.versions as string[])[0])
    expect(prepare(candidate)).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['DUPLICATE_VERSION_PRESENT']),
    }))
  })

  it('blocks divergent relative order', () => {
    const candidate = inventory()
    const versions = candidate.versions as string[]
    ;[versions[8], versions[9]] = [versions[9], versions[8]]
    expect(prepare(candidate)).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['VERSION_ORDER_DIVERGENT']),
    }))
  })

  it('blocks a divergent source hash', () => {
    const copy = structuredClone(manifest)
    const migration = copy.migrations.find(
      (item: { stagingVersion: string }) => item.stagingVersion === '20260718150000',
    )
    migration.sourceSha256 = '0'.repeat(64)
    expect(prepare(inventory(), copy)).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['SOURCE_HASH_DIVERGENT_20260718150000']),
    }))
  })

  it('blocks Production and a missing staging ref', () => {
    expect(() => prepare(inventory({ projectRef: 'njlzossopgknanhkzcbk' })))
      .toThrow(/Production reference forbidden/)
    expect(() => prepare(inventory({ projectRef: undefined })))
      .toThrow(/projectRef/)
  })

  it('blocks a partial or unexpected structural state', () => {
    expect(prepare(inventory({
      structure: { ...EXPECTED_STAGING_INITIAL_STATE, seedanceJobs: 'partial' },
    }))).toEqual(expect.objectContaining({
      decision: STAGING_REMEDIATION_DECISIONS.blocked,
      reasons: expect.arrayContaining(['STRUCTURE_STATE_UNEXPECTED']),
    }))
  })

  it('keeps the report redacted', () => {
    expect(() => prepare({
      ...inventory(),
      accessToken: 'synthetic',
    } as Record<string, unknown>))
      .toThrow(/fields are invalid/)
    const serialized = JSON.stringify(prepare())
    expect(serialized).not.toMatch(/password|secret|token|credential/i)
    expect(serialized).not.toMatch(/https?:\/\//i)
  })

  it.each([
    [['--prod', '--inventory', '/tmp/inventory.json'], /--prod is forbidden/],
    [['--linked', '--inventory', '/tmp/inventory.json'], /--linked is forbidden/],
    [['--inventory', 'https://staging.invalid/inventory.json'], /explicit local file/],
  ] as const)('refuses unsafe CLI arguments %j', (args, expected) => {
    expect(() => assertSafeRemediationArgs([...args])).toThrow(expected)
  })

  it('contains no network client, mutable command or environment loading', () => {
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).not.toMatch(/node:(?:http|https|net|tls)|fetch\(|axios|undici|WebSocket/)
    expect(source).not.toMatch(/spawn|exec|db\s+push|migration\s+repair|process\.env|dotenv|\.env/)
  })
})
