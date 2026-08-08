import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildExpectedStagingAlignmentPlan } from '../../scripts/preproduction/compare-staging-migration-alignment.mjs'
import {
  EXPECTED_STAGING_INITIAL_STATE,
  EXPECTED_STAGING_MISSING_VERSIONS,
  SEEDANCE_POSTCONDITION_STATUSES,
  STAGING_REMEDIATION_DECISIONS,
  assertSafeRemediationArgs,
  evaluateSeedancePostconditions,
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

const tablePrivileges = [
  'DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE',
]
const grantRoles = ['anon', 'authenticated', 'postgres', 'service_role']

function seedanceInventory() {
  return {
    tableExists: true,
    columnCount: 15,
    columns: [
      { ordinal: 1, name: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', identity: null, generated: null },
      { ordinal: 2, name: 'created_at', type: 'timestamp with time zone', nullable: false, default: 'now()', identity: null, generated: null },
      { ordinal: 3, name: 'created_by', type: 'uuid', nullable: true, default: null, identity: null, generated: null },
      { ordinal: 4, name: 'exercise_id', type: 'uuid', nullable: true, default: null, identity: null, generated: null },
      { ordinal: 5, name: 'exercise_name', type: 'text', nullable: false, default: null, identity: null, generated: null },
      { ordinal: 6, name: 'prompt', type: 'text', nullable: false, default: null, identity: null, generated: null },
      { ordinal: 7, name: 'model', type: 'text', nullable: false, default: null, identity: null, generated: null },
      { ordinal: 8, name: 'generation_type', type: 'text', nullable: false, default: null, identity: null, generated: null },
      { ordinal: 9, name: 'params', type: 'jsonb', nullable: false, default: "'{}'::jsonb", identity: null, generated: null },
      { ordinal: 10, name: 'reference_image_url', type: 'text', nullable: true, default: null, identity: null, generated: null },
      { ordinal: 11, name: 'task_id', type: 'text', nullable: false, default: null, identity: null, generated: null },
      { ordinal: 12, name: 'status', type: 'text', nullable: false, default: "'queued'::text", identity: null, generated: null },
      { ordinal: 13, name: 'video_url_remote', type: 'text', nullable: true, default: null, identity: null, generated: null },
      { ordinal: 14, name: 'published_video_url', type: 'text', nullable: true, default: null, identity: null, generated: null },
      { ordinal: 15, name: 'error', type: 'text', nullable: true, default: null, identity: null, generated: null },
    ],
    constraints: [
      { name: 'seedance_jobs_created_by_fkey', type: 'FOREIGN KEY', definition: 'FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL' },
      { name: 'seedance_jobs_exercise_id_fkey', type: 'FOREIGN KEY', definition: 'FOREIGN KEY (exercise_id) REFERENCES exercises_db(id) ON DELETE SET NULL' },
      { name: 'seedance_jobs_pkey', type: 'PRIMARY KEY', definition: 'PRIMARY KEY (id)' },
    ],
    indexes: [
      { name: 'seedance_jobs_created_at_idx', unique: false, primary: false, predicate: null, definition: 'CREATE INDEX seedance_jobs_created_at_idx ON public.seedance_jobs USING btree (created_at DESC)' },
      { name: 'seedance_jobs_pkey', unique: true, primary: true, predicate: null, definition: 'CREATE UNIQUE INDEX seedance_jobs_pkey ON public.seedance_jobs USING btree (id)' },
      { name: 'seedance_jobs_task_id_idx', unique: false, primary: false, predicate: null, definition: 'CREATE INDEX seedance_jobs_task_id_idx ON public.seedance_jobs USING btree (task_id)' },
    ],
    rlsEnabled: true,
    rlsForced: false,
    policies: [],
    explicitGrants: grantRoles.flatMap(role =>
      tablePrivileges.map(privilege => ({ role, privilege }))),
    effectiveGrants: grantRoles.map(role => ({ role, privileges: [...tablePrivileges] })),
    owner: 'postgres',
    triggers: [],
    rowCount: 0,
    historyCount: 1,
  }
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

describe('Seedance migration postconditions', () => {
  it('reports every named postcondition as PASS for the restored staging contract', () => {
    const report = evaluateSeedancePostconditions(seedanceInventory())
    expect(report.status).toBe(SEEDANCE_POSTCONDITION_STATUSES.pass)
    expect(Object.keys(report.checks)).toEqual([
      'tableExists', 'columnCount', 'columns', 'primaryKey', 'foreignKeys',
      'constraints', 'indexes', 'rlsEnabled', 'rlsForced', 'policies', 'grants',
      'owner', 'triggers', 'rowCount', 'historyCount',
    ])
    expect(Object.values(report.checks).every(check => check.status === 'PASS')).toBe(true)
  })

  it('reports dependent controls as ABSENT when the table is absent', () => {
    const report = evaluateSeedancePostconditions({ tableExists: false, historyCount: 0 })
    expect(report.checks.tableExists.status).toBe('FAIL')
    expect(report.checks.columns.status).toBe('ABSENT')
    expect(report.checks.indexes.status).toBe('ABSENT')
    expect(report.checks.policies.status).toBe('ABSENT')
  })

  it.each([
    ['columnCount', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.columnCount = 14 }],
    ['columns', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.columns[4].type = 'character varying' }],
    ['primaryKey', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.constraints.splice(2, 1) }],
    ['foreignKeys', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.constraints.splice(0, 1) }],
    ['constraints', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.constraints.push({ name: 'unexpected_check', type: 'CHECK', definition: 'CHECK (true)' }) }],
    ['indexes', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.indexes.splice(0, 1) }],
    ['rlsEnabled', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.rlsEnabled = false }],
    ['rlsForced', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.rlsForced = true }],
    ['policies', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.policies.push({ name: 'unsafe_all', command: 'ALL' } as never) }],
    ['grants', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.explicitGrants.push({ role: 'PUBLIC', privilege: 'SELECT' }) }],
    ['owner', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.owner = 'authenticated' }],
    ['triggers', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.triggers.push({ name: 'unexpected_trigger' } as never) }],
    ['rowCount', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.rowCount = 1 }],
    ['historyCount', (candidate: ReturnType<typeof seedanceInventory>) => { candidate.historyCount = 0 }],
  ])('identifies only the targeted %s divergence', (check, mutate) => {
    const candidate = seedanceInventory()
    mutate(candidate)
    const report = evaluateSeedancePostconditions(candidate)
    expect(report.checks[check as keyof typeof report.checks].status).toBe('FAIL')
    expect(Object.entries(report.checks)
      .filter(([name, result]) => name !== check && result.status !== 'PASS')).toEqual([])
  })

  it('reports both column controls when a column is absent', () => {
    const candidate = seedanceInventory()
    candidate.columns.splice(14, 1)
    candidate.columnCount = 14
    const report = evaluateSeedancePostconditions(candidate)
    expect(report.checks.columnCount.status).toBe('FAIL')
    expect(report.checks.columns.status).toBe('FAIL')
  })

  it('reports malformed grant evidence as ERROR', () => {
    const candidate = seedanceInventory() as unknown as Record<string, unknown>
    delete candidate.explicitGrants
    expect(evaluateSeedancePostconditions(candidate).checks.grants.status).toBe('ERROR')
  })

  it('is deterministic across a migration replay and excludes unrelated data', () => {
    const candidate = { ...seedanceInventory(), prompt: 'must-not-appear', accessToken: 'must-not-appear' }
    const first = evaluateSeedancePostconditions(candidate)
    const replay = evaluateSeedancePostconditions(candidate)
    expect(replay).toEqual(first)
    expect(JSON.stringify(first)).not.toContain('must-not-appear')
  })

  it('compares PostgreSQL JSONB objects independently of their key order', () => {
    const candidate = seedanceInventory()
    candidate.columns = candidate.columns.map(column => ({
      name: column.name,
      type: column.type,
      default: column.default,
      ordinal: column.ordinal,
      identity: column.identity,
      nullable: column.nullable,
      generated: column.generated,
    }))
    expect(evaluateSeedancePostconditions(candidate).checks.columns.status).toBe('PASS')
  })
})
