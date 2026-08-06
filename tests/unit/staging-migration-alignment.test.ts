import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  STAGING_ALIGNMENT_VERDICTS,
  buildExpectedStagingAlignmentPlan,
  compareStagingMigrationAlignment,
} from '../../scripts/preproduction/compare-staging-migration-alignment.mjs'

const manifest = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'scripts/preproduction/staging-migration-manifest.json'),
    'utf8',
  ),
)
const structure = {
  tables: ['public.profiles'],
  functions: ['public.handle_new_user()'],
  policies: ['profiles_select_self'],
  publications: ['supabase_realtime:public.messages'],
}
const expectedPlan = buildExpectedStagingAlignmentPlan({
  migrationManifest: manifest,
  repositoryRoot: process.cwd(),
  structureInventory: structure,
})

function inventory(versions = expectedPlan.expectedVersions) {
  return {
    projectRef: 'cycbnnojcymjnaqomlyj',
    capturedAt: '2026-08-06T12:00:00.000Z',
    source: 'synthetic-unit-test',
    versions: [...versions],
    structure,
  }
}

function compare(remoteInventory: Record<string, unknown>, requireStructure = false) {
  return compareStagingMigrationAlignment({
    expectedPlan,
    remoteInventory,
    requireStructure,
  })
}

describe('staging migration alignment comparator', () => {
  it('accepts an exact 145/145 staging alignment', () => {
    expect(compare(inventory())).toEqual(expect.objectContaining({
      expectedSourceCount: 149,
      expectedStagingCount: 145,
      remoteCount: 145,
      missingVersions: [],
      extraVersions: [],
      duplicateRemoteVersions: [],
      orderMismatches: [],
      aligned: true,
      verdict: STAGING_ALIGNMENT_VERDICTS.aligned,
    }))
  })

  it('reports one missing remote version', () => {
    const versions = expectedPlan.expectedVersions.slice(1)
    expect(compare(inventory(versions))).toEqual(expect.objectContaining({
      missingVersions: [expectedPlan.expectedVersions[0]],
      aligned: false,
      verdict: STAGING_ALIGNMENT_VERDICTS.missing,
    }))
  })

  it('reports several missing remote versions', () => {
    const missing = expectedPlan.expectedVersions.slice(-7)
    const versions = expectedPlan.expectedVersions.slice(0, -7)
    expect(compare(inventory(versions))).toEqual(expect.objectContaining({
      missingVersions: missing,
      verdict: STAGING_ALIGNMENT_VERDICTS.missing,
    }))
  })

  it('reports an extra remote version', () => {
    const versions = [...expectedPlan.expectedVersions, '20990101000000']
    expect(compare(inventory(versions))).toEqual(expect.objectContaining({
      extraVersions: ['20990101000000'],
      verdict: STAGING_ALIGNMENT_VERDICTS.extra,
    }))
  })

  it('reports a duplicate remote version', () => {
    const versions = [...expectedPlan.expectedVersions, expectedPlan.expectedVersions[0]]
    expect(compare(inventory(versions))).toEqual(expect.objectContaining({
      duplicateRemoteVersions: [expectedPlan.expectedVersions[0]],
      verdict: STAGING_ALIGNMENT_VERDICTS.duplicate,
    }))
  })

  it('reports divergent relative order', () => {
    const versions = [...expectedPlan.expectedVersions]
    ;[versions[10], versions[11]] = [versions[11], versions[10]]
    const report = compare(inventory(versions))
    expect(report.verdict).toBe(STAGING_ALIGNMENT_VERDICTS.order)
    expect(report.orderMismatches).toHaveLength(2)
  })

  it('treats an empty but well-formed inventory as missing all versions', () => {
    const report = compare(inventory([]))
    expect(report.remoteCount).toBe(0)
    expect(report.missingVersions).toHaveLength(145)
    expect(report.verdict).toBe(STAGING_ALIGNMENT_VERDICTS.missing)
  })

  it.each([
    { projectRef: 'cycbnnojcymjnaqomlyj' },
    { ...inventory(), versions: ['not-a-version'] },
    { ...inventory(), capturedAt: 'not-a-date' },
  ])('refuses a malformed remote inventory without normalizing it', candidate => {
    const report = compare(candidate)
    expect(report.verdict).toBe(STAGING_ALIGNMENT_VERDICTS.invalid)
    if ('capturedAt' in candidate && candidate.capturedAt === 'not-a-date') {
      expect(report.capturedAt).toBeNull()
    }
  })

  it('refuses comparing the remote inventory to all 149 source versions', () => {
    const sourceVersions = manifest.migrations.map(
      (migration: { stagingVersion: string }) => migration.stagingVersion,
    )
    expect(() => compareStagingMigrationAlignment({
      expectedPlan: {
        ...expectedPlan,
        expectedStagingCount: 149,
        expectedVersions: sourceVersions,
      },
      remoteInventory: inventory(),
    })).toThrow(/145-version staging plan/)
  })

  it('preserves the five explicit source exclusions', () => {
    const report = compare(inventory())
    expect(report.excludedSources).toEqual([
      '20260419_cleanup_empty_programs.sql',
      '20260419_invited_by_coach.sql',
      '20260530033322_backfill_next_diagnostic_at_orphans.sql',
      '20260530034000_backfill_week_start_sunday_to_monday.sql',
      '20260530044500_backfill_full_name_capitalize.sql',
    ])
  })

  it('preserves the staging-only overlay', () => {
    expect(compare(inventory()).overlayVersions).toEqual(['20260419000010'])
    expect(expectedPlan.expectedVersions).toContain('20260419000010')
  })

  it('uses the disambiguated staging versions for historical collisions', () => {
    expect(expectedPlan.expectedVersions).toEqual(expect.arrayContaining([
      '20260327000001',
      '20260327000002',
      '20260327000003',
    ]))
    expect(expectedPlan.expectedVersions).not.toContain('20260327')
  })

  it('keeps secret-like metadata out of the report', () => {
    const report = compare({
      ...inventory(),
      operatorNote: 'synthetic note not returned',
    })
    const serialized = JSON.stringify(report)
    expect(serialized).not.toContain('operatorNote')
    expect(serialized).not.toContain('synthetic note')
    expect(() => compare({
      ...inventory(),
      accessToken: 'synthetic-sensitive-value',
    })).toThrow(/Secret-like field/)
    expect(() => compare({
      ...inventory(),
      source: 'https://operator:credential@staging.invalid/inventory',
    })).toThrow(/URL credentials/)
  })

  it('refuses the Production project ref and host', () => {
    expect(() => compare({
      ...inventory(),
      projectRef: 'njlzossopgknanhkzcbk',
    })).toThrow(/Production/)
    expect(() => compare({
      ...inventory(),
      host: 'app.moovx.ch',
    })).toThrow(/Production/)
  })

  it('accepts only the exact staging project ref', () => {
    expect(compare(inventory()).verdict).toBe(STAGING_ALIGNMENT_VERDICTS.aligned)
    expect(() => compare({ ...inventory(), projectRef: 'another-project' }))
      .toThrow(/projectRef must be/)
    expect(() => compare({ ...inventory(), projectRef: undefined }))
      .toThrow(/projectRef must be/)
  })

  it('reports incomplete evidence when structural proof is required but absent', () => {
    const candidate = inventory()
    delete (candidate as { structure?: typeof structure }).structure
    expect(compare(candidate, true).verdict)
      .toBe(STAGING_ALIGNMENT_VERDICTS.incomplete)
  })

  it('reports synthetic structural drift', () => {
    const candidate = inventory()
    candidate.structure = {
      ...structure,
      tables: ['public.profiles', 'public.unexpected_table'],
    }
    expect(compare(candidate, true).verdict)
      .toBe(STAGING_ALIGNMENT_VERDICTS.structure)
  })

  it.each([
    [['--linked'], /--linked is forbidden/],
    [['--inventory', 'https://staging.invalid/inventory.json'], /explicit local file/],
    [['--inventory', '/tmp/inventory.json', 'unexpected'], /Unsupported argument/],
  ] as const)('keeps the CLI local for arguments %j', (args, errorPattern) => {
    const result = spawnSync(
      process.execPath,
      [
        resolve(
          process.cwd(),
          'scripts/preproduction/compare-staging-migration-alignment.mjs',
        ),
        ...args,
      ],
      { encoding: 'utf8' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(errorPattern)
    expect(result.stdout).toBe('')
  })
})
