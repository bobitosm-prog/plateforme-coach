import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  INVENTORY_STATUSES,
  ISOLATION_CLASSIFICATIONS,
  OFFICIAL_CLI_ROLE_GRANT,
  OFFICIAL_REALTIME_PARAMETER_GRANT,
  PRIMARY_LOCAL_PORTS,
  REQUIRED_BACKUP_FILES,
  assertIsolatedTarget,
  assertInventoryPrerequisites,
  assertSafeRestoreArgs,
  buildCanonicalRestoreSql,
  compareRestoreProofs,
  classifyInventoryPrerequisites,
  executeRestoreRuns,
  neutralizeUnsupportedCliRoleGrant,
  normalizeSupabaseDockerProjectId,
  prepareOfficialCliRoleGrant,
  prepareOfficialRealtimeParameterGrant,
  sanitizeRestoreError,
  sanitizeInventoryQueryError,
  validateBackupDirectory,
  validateSqlArtifactSafety,
  verifyDockerIsolationSnapshot,
  waitForDockerIsolation,
  withGuaranteedCleanup,
} from '../../scripts/preproduction/restore-staging-backup-locally.mjs'

const temporaryDirectories: string[] = []

function temporaryDirectory() {
  const directory = mkdtempSync(resolve(tmpdir(), 'moovx-restore-unit-'))
  temporaryDirectories.push(directory)
  return directory
}

function backupFiles(overrides: Record<string, string> = {}) {
  return {
    'roles.sql': { source: `CREATE ROLE fixture_owner NOLOGIN;\n${OFFICIAL_CLI_ROLE_GRANT}\n${OFFICIAL_REALTIME_PARAMETER_GRANT}\n` },
    'schema.sql': { source: 'CREATE SCHEMA restore_fixture AUTHORIZATION fixture_owner;' },
    'data.sql': { source: 'SET search_path TO restore_fixture;' },
    'history_schema.sql': { source: 'CREATE SCHEMA IF NOT EXISTS supabase_migrations;' },
    'history_data.sql': { source: 'SET search_path TO supabase_migrations;' },
    ...Object.fromEntries(Object.entries(overrides).map(([name, source]) => [name, { source }])),
  }
}

function isolationSnapshot(projectId: string) {
  const dockerProjectId = normalizeSupabaseDockerProjectId(projectId)
  const labels = {
    'com.docker.compose.project': dockerProjectId,
    'com.supabase.cli.project': dockerProjectId,
  }
  return {
    containers: [{
      name: `supabase_db_${dockerProjectId}`,
      labels,
      publishedPorts: { '5432/tcp': [{ HostPort: '62001' }] },
      mounts: [{
        type: 'volume',
        name: `supabase_db_${dockerProjectId}`,
        destination: '/var/lib/postgresql/data',
      }],
    }],
    volumes: [{ name: `supabase_db_${dockerProjectId}`, labels }],
  }
}

afterEach(() => {
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true })
  }
})

describe('staging backup local restore contract', () => {
  const nominalInventoryPresence = {
    authUsers: true,
    storageObjects: true,
    migrationHistory: true,
    plpgsql: true,
    fixtureTable: true,
    fixturePolicy: true,
    fixturePublication: true,
    fixtureSecurityDefiner: true,
    billingPayments: false,
  }

  it('builds the canonical roles, schema, data and history order', () => {
    const sql = buildCanonicalRestoreSql(backupFiles())
    const positions = [
      'CREATE ROLE fixture_owner',
      'CREATE SCHEMA restore_fixture',
      'SET session_replication_role = replica',
      'SET search_path TO restore_fixture',
      'CREATE SCHEMA IF NOT EXISTS supabase_migrations',
      'SET search_path TO supabase_migrations',
    ].map(value => sql.indexOf(value))
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
    expect(sql).toMatch(/^\\set ON_ERROR_STOP on\nBEGIN;/)
    expect(sql).toMatch(/COMMIT;$/)
  })

  it('accepts an already sanitized roles dump without transforming it', () => {
    const source = 'CREATE ROLE fixture_owner NOLOGIN;\n'
    expect(prepareOfficialCliRoleGrant(source)).toEqual({
      source,
      classification: 'OFFICIAL_GRANT_ALREADY_OMITTED',
    })
  })

  it('neutralizes only the unsupported official CLI role grant', () => {
    const source = `CREATE ROLE fixture_owner;\n${OFFICIAL_CLI_ROLE_GRANT}\nGRANT fixture_owner TO postgres;`
    const original = structuredClone(source)
    const result = prepareOfficialCliRoleGrant(source)
    expect(result.classification).toBe('OFFICIAL_GRANT_FILTERED')
    expect(result.source).not.toContain(OFFICIAL_CLI_ROLE_GRANT)
    expect(result.source).toContain('GRANT fixture_owner TO postgres;')
    expect(source).toBe(original)
  })

  it('recognizes the exact official grant across whitespace and newlines', () => {
    const source = 'GRANT "postgres" TO "cli_login_postgres"\nWITH INHERIT FALSE GRANTED BY "supabase_admin";'
    expect(prepareOfficialCliRoleGrant(source).classification).toBe('OFFICIAL_GRANT_FILTERED')
  })

  it('blocks multiple official grants with a redacted classification', () => {
    try {
      prepareOfficialCliRoleGrant(`${OFFICIAL_CLI_ROLE_GRANT}\n${OFFICIAL_CLI_ROLE_GRANT}`)
      throw new Error('expected contract rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport.classification', 'MULTIPLE_OFFICIAL_GRANTS')
      const report = (error as { restoreReport?: unknown }).restoreReport
      expect(JSON.stringify(report)).not.toContain(OFFICIAL_CLI_ROLE_GRANT)
    }
  })

  it.each([
    'GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "other_admin";',
    'GRANT "postgres" TO "cli_login_postgres" WITH ADMIN OPTION GRANTED BY "supabase_admin";',
    'GRANT "fixture_owner" TO "cli_login_postgres" GRANTED BY "supabase_admin";',
    'GRANT "postgres" TO "other_role" WITH INHERIT FALSE GRANTED BY "supabase_admin";',
    'grant postgres to cli_login_postgres',
  ])('blocks an unrecognized related privilege grant without leaking it', variant => {
    try {
      prepareOfficialCliRoleGrant(variant)
      throw new Error('expected contract rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport.classification', 'UNRECOGNIZED_PRIVILEGE_GRANT')
      const report = (error as { restoreReport?: unknown }).restoreReport
      expect(JSON.stringify(report)).not.toContain(variant)
    }
  })

  it('ignores relevant words in comments and string literals', () => {
    const source = [
      '-- cli_login_postgres GRANT "postgres" TO "other_role";',
      "SELECT 'GRANT postgres TO cli_login_postgres GRANTED BY supabase_admin';",
      'CREATE ROLE fixture_owner NOLOGIN;',
    ].join('\n')
    expect(prepareOfficialCliRoleGrant(source)).toEqual({
      source,
      classification: 'OFFICIAL_GRANT_ALREADY_OMITTED',
    })
  })

  it('is deterministic for sanitized and filtered inputs', () => {
    const sanitized = 'CREATE ROLE fixture_owner NOLOGIN;\n'
    const filtered = `${sanitized}${OFFICIAL_CLI_ROLE_GRANT}\n`
    expect(prepareOfficialCliRoleGrant(sanitized)).toEqual(prepareOfficialCliRoleGrant(sanitized))
    expect(prepareOfficialCliRoleGrant(filtered)).toEqual(prepareOfficialCliRoleGrant(filtered))
    expect(neutralizeUnsupportedCliRoleGrant(sanitized)).toBe(sanitized)
  })

  it('filters the exact managed realtime parameter grant only in memory', () => {
    const source = [
      'ALTER ROLE anon SET statement_timeout TO \'3s\';',
      OFFICIAL_REALTIME_PARAMETER_GRANT,
      'GRANT SELECT ON TABLE public.items TO authenticated;',
    ].join('\n')
    const original = structuredClone(source)
    const result = prepareOfficialRealtimeParameterGrant(source)

    expect(result.classification).toBe('OFFICIAL_PARAMETER_GRANT_FILTERED')
    expect(result.source).not.toContain(OFFICIAL_REALTIME_PARAMETER_GRANT)
    expect(result.source).toContain('ALTER ROLE anon SET statement_timeout')
    expect(result.source).toContain('GRANT SELECT ON TABLE public.items TO authenticated;')
    expect(source).toBe(original)
  })

  it('accepts a roles dump where the managed parameter grant is already omitted', () => {
    const source = 'ALTER ROLE anon SET statement_timeout TO \'3s\';'
    expect(prepareOfficialRealtimeParameterGrant(source)).toEqual({
      source,
      classification: 'OFFICIAL_PARAMETER_GRANT_ALREADY_OMITTED',
    })
  })

  it('recognizes the exact managed parameter grant across whitespace', () => {
    const source = 'GRANT SET ON PARAMETER\n"log_min_messages" TO\n"supabase_realtime_admin";'
    expect(prepareOfficialRealtimeParameterGrant(source).classification)
      .toBe('OFFICIAL_PARAMETER_GRANT_FILTERED')
  })

  it('blocks multiple managed parameter grants', () => {
    expect(() => prepareOfficialRealtimeParameterGrant(
      `${OFFICIAL_REALTIME_PARAMETER_GRANT}\n${OFFICIAL_REALTIME_PARAMETER_GRANT}`,
    )).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: 'MULTIPLE_OFFICIAL_PARAMETER_GRANTS',
      }),
    }))
  })

  it.each([
    'GRANT SET ON PARAMETER "log_min_messages" TO "authenticated";',
    'GRANT SET ON PARAMETER "statement_timeout" TO "supabase_realtime_admin";',
    'GRANT ALTER SYSTEM ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";',
    'GRANT SET ON PARAMETER log_min_messages TO supabase_realtime_admin;',
  ])('blocks an unrecognized managed parameter grant variant', variant => {
    try {
      prepareOfficialRealtimeParameterGrant(variant)
      throw new Error('expected parameter grant rejection')
    } catch (error) {
      expect(error).toHaveProperty(
        'restoreReport.classification',
        'UNRECOGNIZED_PARAMETER_GRANT',
      )
      expect(JSON.stringify((error as { restoreReport?: unknown }).restoreReport))
        .not.toContain(variant)
    }
  })

  it('ignores managed parameter grant motifs in comments and strings', () => {
    const source = [
      `-- ${OFFICIAL_REALTIME_PARAMETER_GRANT}`,
      `SELECT '${OFFICIAL_REALTIME_PARAMETER_GRANT.replaceAll("'", "''")}';`,
      'ALTER ROLE anon SET statement_timeout TO \'3s\';',
    ].join('\n')
    expect(prepareOfficialRealtimeParameterGrant(source)).toEqual({
      source,
      classification: 'OFFICIAL_PARAMETER_GRANT_ALREADY_OMITTED',
    })
  })

  it('removes both known incompatible grants while preserving restore order', () => {
    const sql = buildCanonicalRestoreSql(backupFiles())
    expect(sql).not.toContain(OFFICIAL_CLI_ROLE_GRANT)
    expect(sql).not.toContain(OFFICIAL_REALTIME_PARAMETER_GRANT)
    expect(sql).toMatch(/^\\set ON_ERROR_STOP on\nBEGIN;/)
    expect(sql).toMatch(/COMMIT;$/)
  })

  it('classifies the nominal inventory contract explicitly', () => {
    expect(assertInventoryPrerequisites(nominalInventoryPresence)).toEqual({
      auth: 'PRESENT',
      storage: 'PRESENT',
      migrationHistory: 'PRESENT',
      extensions: 'PRESENT',
      fixture: 'PRESENT',
      policies: 'PRESENT',
      publications: 'PRESENT',
      securityDefiner: 'PRESENT',
      billing: 'NOT_APPLICABLE',
    })
  })

  it.each([
    ['authUsers', 'AUTH_USERS', 'auth'],
    ['storageObjects', 'STORAGE_OBJECTS', 'storage'],
    ['migrationHistory', 'MIGRATION_HISTORY', 'supabase_migrations'],
    ['plpgsql', 'PLPGSQL_EXTENSION', null],
  ] as const)('blocks an absent required inventory object: %s', (field, queryType, schema) => {
    const presence = { ...nominalInventoryPresence, [field]: false }
    try {
      assertInventoryPrerequisites(presence)
      throw new Error('expected absent inventory object rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport', expect.objectContaining({
        phase: 'inventory',
        classification: 'INVENTORY_REQUIRED_OBJECT_ABSENT',
        queryType,
        schema,
        status: 'ABSENT',
      }))
    }
  })

  it('distinguishes optional fixture evidence from missing required objects', () => {
    const statuses = classifyInventoryPrerequisites({
      ...nominalInventoryPresence,
      fixtureTable: false,
      fixturePolicy: false,
      fixturePublication: false,
      fixtureSecurityDefiner: false,
    })
    expect(statuses.fixture).toBe(INVENTORY_STATUSES.notApplicable)
    expect(statuses.policies).toBe(INVENTORY_STATUSES.notApplicable)
    expect(statuses.publications).toBe(INVENTORY_STATUSES.notApplicable)
    expect(statuses.securityDefiner).toBe(INVENTORY_STATUSES.notApplicable)
  })

  it('reports an absent fixture publication without converting it to an SQL error', () => {
    const statuses = classifyInventoryPrerequisites({
      ...nominalInventoryPresence,
      fixturePublication: false,
    })
    expect(statuses.fixture).toBe(INVENTORY_STATUSES.present)
    expect(statuses.publications).toBe(INVENTORY_STATUSES.absent)
  })

  it('classifies inventory permission denial as ERROR, never ABSENT', () => {
    const report = sanitizeInventoryQueryError(
      'ERROR: 42501: permission denied\nSTATEMENT: SELECT 1;',
      'INVENTORY_PREREQUISITES',
    )
    expect(report).toEqual(expect.objectContaining({
      phase: 'inventory',
      sqlstate: '42501',
      operation: 'SELECT',
      classification: 'INVENTORY_PERMISSION_DENIED',
      status: 'ERROR',
    }))
    expect(report.status).not.toBe(INVENTORY_STATUSES.absent)
  })

  it('classifies an invalid catalog query as ERROR, never ABSENT', () => {
    const report = sanitizeInventoryQueryError(
      'ERROR: 42703: column does not exist\nSTATEMENT: SELECT missing_column;',
      'INVENTORY_AGGREGATE',
      2,
    )
    expect(report).toEqual(expect.objectContaining({
      sqlstate: '42703',
      operation: 'SELECT',
      queryType: 'INVENTORY_AGGREGATE',
      lineOrOrdinal: 2,
      classification: 'INVENTORY_QUERY_ERROR',
      status: 'ERROR',
    }))
    expect(report.status).not.toBe(INVENTORY_STATUSES.absent)
  })

  it.each([
    ['42501', 'ALTER TABLE public.items OWNER TO fixture_owner;', 'ALTER OWNER', 'INSUFFICIENT_PRIVILEGE'],
    ['42501', 'SET ROLE fixture_owner;', 'SET ROLE', 'INSUFFICIENT_PRIVILEGE'],
    ['42501', 'GRANT SELECT ON TABLE public.items TO fixture_owner;', 'GRANT', 'INSUFFICIENT_PRIVILEGE'],
    ['42501', OFFICIAL_REALTIME_PARAMETER_GRANT, 'GRANT SET ON PARAMETER', 'INSUFFICIENT_PRIVILEGE'],
    ['42704', 'GRANT postgres TO missing_role;', 'GRANT', 'MISSING_OBJECT'],
    ['42710', 'CREATE EXTENSION fixture;', 'CREATE EXTENSION', 'DUPLICATE_OBJECT'],
  ])('sanitizes SQLSTATE %s for %s', (state, statement, operation, classification) => {
    const report = sanitizeRestoreError(
      `ERROR: ${state}: synthetic failure\nSTATEMENT: ${statement}`,
      'schema_restore',
    )
    expect(report).toEqual(expect.objectContaining({
      phase: 'schema_restore',
      sqlstate: state,
      operation,
      classification,
    }))
  })

  it('removes credentials and connection strings from error classification', () => {
    const report = sanitizeRestoreError(
      'ERROR: 42501: permission denied password=synthetic postgresql://user:value@remote.invalid/db',
    )
    expect(report.sensitiveDetailRemoved).toBe(true)
    expect(JSON.stringify(report)).not.toMatch(/synthetic|remote\.invalid|user:value/)
  })

  it('refuses remote targets and linked or Production modes', () => {
    expect(() => assertSafeRestoreArgs(['--backup-dir', 'https://remote.invalid/a', '--runs', '2']))
      .toThrow(/Remote/)
    expect(() => assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', '2', '--linked', 'yes']))
      .toThrow(/--linked/)
    expect(() => assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', '2', '--prod', 'yes']))
      .toThrow(/--prod/)
  })

  it('refuses no-owner because the official split SQL contract preserves ownership', () => {
    expect(() => assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', '2', '--no-owner', 'yes']))
      .toThrow(/--no-owner/)
  })

  it('defaults to two restore runs', () => {
    expect(assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a']))
      .toEqual({ backupDirectory: '/private/tmp/a', runs: 2 })
  })

  it.each(['1', '2'])('accepts the bounded %s-run local mode', runs => {
    expect(assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', runs]))
      .toEqual({ backupDirectory: '/private/tmp/a', runs: Number(runs) })
  })

  it.each(['0', '3', '-1', '1.5', 'abc'])('refuses invalid run count %s', runs => {
    try {
      assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', runs])
      throw new Error('expected run count rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport.classification', 'INVALID_RUN_COUNT')
    }
  })

  it('refuses a missing or duplicated run count', () => {
    expect(() => assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs']))
      .toThrow(/incomplete/)
    expect(() => assertSafeRestoreArgs([
      '--backup-dir', '/private/tmp/a', '--runs', '1', '--runs', '2',
    ])).toThrow(/Duplicate/)
  })

  it('executes one restore without cross-run comparison', async () => {
    const calls: Array<{ runNumber: number, ports: { db: number } }> = []
    let comparisons = 0
    const report = await executeRestoreRuns({
      backup: { files: backupFiles() },
      requestedRuns: 1,
      ports: [{ db: 62001 }],
      restoreRun: async ({ runNumber, ports }) => {
        calls.push({ runNumber, ports })
        return { fingerprint: 'one', counts: { rows: 2 }, owners: { auth: 'supabase_admin' } }
      },
      compareProofs: () => {
        comparisons += 1
        return true
      },
    })

    expect(calls).toEqual([{ runNumber: 1, ports: { db: 62001 } }])
    expect(comparisons).toBe(0)
    expect(report).toEqual(expect.objectContaining({
      status: 'RESTORABLE',
      requestedRuns: 1,
      completedRuns: 1,
      fingerprint: 'one',
      fingerprintsIdentical: null,
      parameterGrantClassification: 'OFFICIAL_PARAMETER_GRANT_FILTERED',
    }))
    expect(report.runs).toHaveLength(1)
  })

  it('executes and compares two independent restores', async () => {
    const calls: number[] = []
    let comparisons = 0
    const proof = { fingerprint: 'same', counts: { rows: 2 }, owners: { auth: 'supabase_admin' } }
    const report = await executeRestoreRuns({
      backup: { files: backupFiles() },
      requestedRuns: 2,
      ports: [{ db: 62001 }, { db: 62002 }],
      restoreRun: async ({ runNumber }) => {
        calls.push(runNumber)
        return structuredClone(proof)
      },
      compareProofs: (first, second) => {
        comparisons += 1
        return compareRestoreProofs(first, second)
      },
    })

    expect(calls).toEqual([1, 2])
    expect(comparisons).toBe(1)
    expect(report).toEqual(expect.objectContaining({
      status: 'RESTORABLE',
      requestedRuns: 2,
      completedRuns: 2,
      fingerprintsIdentical: true,
    }))
    expect(report.runs).toHaveLength(2)
  })

  it('blocks a divergent two-run restore proof', async () => {
    await expect(executeRestoreRuns({
      backup: { files: backupFiles() },
      requestedRuns: 2,
      ports: [{ db: 62001 }, { db: 62002 }],
      restoreRun: async ({ runNumber }) => ({
        fingerprint: `run-${runNumber}`,
        counts: { rows: 2 },
        owners: { auth: 'supabase_admin' },
      }),
    })).rejects.toThrow(/fingerprints/)
  })

  it('stops a one-run execution after its first failure', async () => {
    let attempts = 0
    let cleanups = 0
    await expect(executeRestoreRuns({
      backup: { files: backupFiles() },
      requestedRuns: 1,
      ports: [{ db: 62001 }],
      restoreRun: async () => withGuaranteedCleanup(async () => {
        attempts += 1
        throw new Error('synthetic restore failure')
      }, async () => { cleanups += 1 }),
    })).rejects.toThrow(/synthetic restore failure/)
    expect(attempts).toBe(1)
    expect(cleanups).toBe(1)
  })

  it('cleans each attempted restore when the second run fails', async () => {
    let attempts = 0
    let cleanups = 0
    await expect(executeRestoreRuns({
      backup: { files: backupFiles() },
      requestedRuns: 2,
      ports: [{ db: 62001 }, { db: 62002 }],
      restoreRun: async ({ runNumber }) => withGuaranteedCleanup(async () => {
        attempts += 1
        if (runNumber === 2) throw new Error('synthetic second restore failure')
        return {
          fingerprint: 'first',
          counts: { rows: 2 },
          owners: { auth: 'supabase_admin' },
        }
      }, async () => { cleanups += 1 }),
    })).rejects.toThrow(/synthetic second restore failure/)
    expect(attempts).toBe(2)
    expect(cleanups).toBe(2)
  })

  it('keeps the explicit historical two-run argument', () => {
    expect(assertSafeRestoreArgs(['--backup-dir', '/private/tmp/a', '--runs', '2']))
      .toEqual({ backupDirectory: '/private/tmp/a', runs: 2 })
  })

  it('refuses primary ports, duplicate ports and invalid project IDs', () => {
    const base = { projectId: 'moovx-staging-restore-unit', temporaryRoot: '/private/tmp/unit' }
    expect(() => assertIsolatedTarget({ ...base, ports: { db: PRIMARY_LOCAL_PORTS[0], api: 62001 } }))
      .toThrow(/Primary local port/)
    expect(() => assertIsolatedTarget({ ...base, ports: { db: 62001, api: 62001 } }))
      .toThrow(/unique/)
    expect(() => assertIsolatedTarget({ ...base, projectId: 'plateforme-coach', ports: { db: 62001 } }))
      .toThrow(/project ID/)
  })

  it('refuses repository and non-temporary restore roots', () => {
    expect(() => assertIsolatedTarget({
      projectId: 'moovx-staging-restore-unit',
      ports: { db: 62001 },
      temporaryRoot: process.cwd(),
    })).toThrow(/temporary/)
  })

  it('accepts an isolated local target', () => {
    expect(() => assertIsolatedTarget({
      projectId: 'moovx-staging-restore-unit',
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
    })).not.toThrow()
  })

  it('confirms a nominal Docker isolation snapshot', () => {
    const projectId = 'moovx-staging-restore-unit'
    expect(verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot: isolationSnapshot(projectId),
    })).toEqual(expect.objectContaining({
      classification: ISOLATION_CLASSIFICATIONS.confirmed,
      dockerProjectId: projectId,
    }))
  })

  it('accepts CLI normalization only when both Docker labels match', () => {
    const projectId = 'moovx-staging-restore-dryrun-12345-abcdefgh'
    expect(projectId.length).toBeGreaterThan(40)
    expect(normalizeSupabaseDockerProjectId(projectId)).toBe(projectId.slice(0, 40))
    expect(verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot: isolationSnapshot(projectId),
    })).toEqual(expect.objectContaining({
      classification: ISOLATION_CLASSIFICATIONS.confirmed,
      dockerProjectId: projectId.slice(0, 40),
    }))
  })

  it('blocks a mismatched Docker project label', () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshot = isolationSnapshot(projectId)
    snapshot.containers[0].labels['com.docker.compose.project'] = 'foreign-project'
    expect(() => verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot,
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.projectMismatch,
      }),
    }))
  })

  it('blocks a primary database volume', () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshot = isolationSnapshot(projectId)
    snapshot.volumes[0].name = 'supabase_db_plateforme-coach'
    expect(() => verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot,
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.volumeMismatch,
      }),
    }))
  })

  it('blocks a conflicting published database port', () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshot = isolationSnapshot(projectId)
    snapshot.containers[0].publishedPorts['5432/tcp'][0].HostPort = '55322'
    expect(() => verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot,
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.portConflict,
      }),
    }))
  })

  it('blocks a genuinely missing Docker resource', () => {
    expect(() => verifyDockerIsolationSnapshot({
      projectId: 'moovx-staging-restore-unit',
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot: { containers: [], volumes: [] },
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.missing,
      }),
    }))
  })

  it('accepts a resource that appears within the bounded polling window', async () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshots = [
      { containers: [], volumes: [] },
      isolationSnapshot(projectId),
    ]
    let reads = 0
    await expect(waitForDockerIsolation({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      readSnapshot: () => snapshots[Math.min(reads++, snapshots.length - 1)],
      pollIntervalMs: 250,
      timeoutMs: 500,
      sleep: async () => {},
    })).resolves.toEqual(expect.objectContaining({
      classification: ISOLATION_CLASSIFICATIONS.confirmed,
    }))
    expect(reads).toBe(2)
  })

  it('blocks a resource that remains absent after the polling timeout', async () => {
    let reads = 0
    await expect(waitForDockerIsolation({
      projectId: 'moovx-staging-restore-unit',
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      readSnapshot: () => {
        reads += 1
        return { containers: [], volumes: [] }
      },
      pollIntervalMs: 250,
      timeoutMs: 500,
      sleep: async () => {},
    })).rejects.toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.missing,
      }),
    }))
    expect(reads).toBe(3)
  })

  it('refuses a similarly named foreign container', () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshot = isolationSnapshot(projectId)
    snapshot.containers.push({
      ...structuredClone(snapshot.containers[0]),
      name: 'supabase_db_moovx-staging-restore-unit-similar',
      labels: {
        'com.docker.compose.project': 'foreign-project',
        'com.supabase.cli.project': 'foreign-project',
      },
    })
    expect(() => verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot,
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.projectMismatch,
      }),
    }))
  })

  it('blocks resources without both authoritative labels', () => {
    const projectId = 'moovx-staging-restore-unit'
    const snapshot = isolationSnapshot(projectId)
    delete snapshot.volumes[0].labels['com.docker.compose.project']
    expect(() => verifyDockerIsolationSnapshot({
      projectId,
      ports: { db: 62001, api: 62002 },
      temporaryRoot: '/private/tmp/moovx-unit',
      snapshot,
    })).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({
        classification: ISOLATION_CLASSIFICATIONS.labelMismatch,
      }),
    }))
  })

  it('validates the exact five-file backup contract', () => {
    const directory = temporaryDirectory()
    for (const name of REQUIRED_BACKUP_FILES) writeFileSync(resolve(directory, name), 'SELECT 1;\n')
    expect(validateBackupDirectory(directory).files).toHaveProperty('roles.sql')
  })

  it('refuses a missing backup artifact', () => {
    const directory = temporaryDirectory()
    for (const name of REQUIRED_BACKUP_FILES.slice(0, -1)) writeFileSync(resolve(directory, name), 'SELECT 1;\n')
    expect(() => validateBackupDirectory(directory)).toThrow(/incomplete/)
  })

  it('refuses an unexpected SQL artifact', () => {
    const directory = temporaryDirectory()
    for (const name of [...REQUIRED_BACKUP_FILES, 'unexpected.sql']) {
      writeFileSync(resolve(directory, name), 'SELECT 1;\n')
    }
    expect(() => validateBackupDirectory(directory)).toThrow(/unexpected/)
  })

  it.each(['\\connect remote', '\\! shell-command', 'COPY public.items FROM PROGRAM'])
    ('refuses unsafe dump content: %s', unsafe => {
      const directory = temporaryDirectory()
      for (const name of REQUIRED_BACKUP_FILES) writeFileSync(resolve(directory, name), 'SELECT 1;\n')
      writeFileSync(resolve(directory, 'schema.sql'), `${unsafe};\n`)
      expect(() => validateBackupDirectory(directory)).toThrow(/Unsafe/)
    })

  it.each([
    ['\\! rm -rf /tmp/example', 1],
    ['   \\! echo example', 1],
    ['SELECT 1;\n\t\\! echo example', 2],
  ])('blocks an executable psql shell command without exposing it: %s', (source, line) => {
    try {
      validateSqlArtifactSafety(source, 'schema.sql')
      throw new Error('expected shell command rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport', expect.objectContaining({
        artifact: 'schema.sql',
        classification: 'UNSAFE_PSQL_SHELL_COMMAND',
        line,
        type: 'PSQL_SHELL_COMMAND',
      }))
      expect(JSON.stringify((error as { restoreReport?: unknown }).restoreReport))
        .not.toMatch(/rm -rf|echo example/)
    }
  })

  it.each([
    '-- example: \\! echo danger',
    '/* example: \\! echo danger */\nSELECT 1;',
    "SELECT '\\! echo danger';",
    'SELECT "\\! identifier";',
    'DO $$ BEGIN RAISE NOTICE \'\\! example\'; END $$;',
    'DO $body$ BEGIN /* \\! example */ NULL; END $body$;',
    "COMMENT ON FUNCTION public.example() IS '\\! is forbidden';",
  ])('accepts a documentary psql shell motif: %s', source => {
    expect(validateSqlArtifactSafety(source, 'schema.sql')).toBe(true)
  })

  it.each([
    "COPY public.items FROM PROGRAM 'curl example.invalid';",
    "COPY public.items TO PROGRAM 'processor';",
    "cOpY public.items FrOm PrOgRaM 'processor';",
    "COPY (\n  SELECT *\n  FROM public.items\n)\nTO PROGRAM 'processor';",
  ])('blocks executable COPY PROGRAM without exposing it: %s', source => {
    try {
      validateSqlArtifactSafety(source, 'schema.sql')
      throw new Error('expected COPY PROGRAM rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport', expect.objectContaining({
        artifact: 'schema.sql',
        classification: 'UNSAFE_COPY_PROGRAM',
        type: 'COPY_PROGRAM',
      }))
      expect(JSON.stringify((error as { restoreReport?: unknown }).restoreReport))
        .not.toMatch(/curl|processor|public\.items/)
    }
  })

  it.each([
    "-- COPY public.items FROM PROGRAM 'processor';",
    "/* COPY public.items TO PROGRAM 'processor'; */\nSELECT 1;",
    "SELECT 'COPY public.items TO PROGRAM ''processor''';",
    'SELECT "COPY public.items FROM PROGRAM";',
    "CREATE FUNCTION public.example() RETURNS text LANGUAGE plpgsql AS $$ BEGIN RETURN 'COPY public.items FROM PROGRAM'; END; $$;",
    "CREATE FUNCTION public.example() RETURNS text LANGUAGE plpgsql AS $body$ BEGIN RETURN 'COPY public.items TO PROGRAM'; END; $body$;",
    "COMMENT ON FUNCTION public.example() IS 'COPY PROGRAM is forbidden';",
    'COPY public.items TO STDOUT;\nCOPY public.other_items TO STDOUT;',
    [
      'COPY public.items (label) FROM STDIN;',
      '\\! is literal row data',
      "COPY public.items TO PROGRAM 'literal row data'",
      "unclosed ' and /* and $body$ are literal row data",
      '\\.',
      'SELECT 1;',
    ].join('\n'),
  ])('accepts a non-executable COPY PROGRAM motif: %s', source => {
    expect(validateSqlArtifactSafety(source, 'schema.sql')).toBe(true)
  })

  it.each([
    ['/* unclosed', 'BLOCK_COMMENT'],
    ["SELECT 'unclosed", 'SINGLE_QUOTED_STRING'],
    ['SELECT "unclosed', 'DOUBLE_QUOTED_IDENTIFIER'],
    ['DO $$ BEGIN NULL; END;', 'DOLLAR_QUOTED_BODY'],
    ['DO $body$ BEGIN NULL; END;', 'DOLLAR_QUOTED_BODY'],
    ['COPY public.items FROM STDIN;\nunterminated data', 'COPY_STDIN_DATA'],
  ])('fails closed for incomplete SQL lexing: %s', (source, patternType) => {
    try {
      validateSqlArtifactSafety(source, 'schema.sql')
      throw new Error('expected incomplete lexing rejection')
    } catch (error) {
      expect(error).toHaveProperty('restoreReport', expect.objectContaining({
        artifact: 'schema.sql',
        classification: 'SQL_LEXING_INCOMPLETE',
        type: patternType,
      }))
      expect(JSON.stringify((error as { restoreReport?: unknown }).restoreReport))
        .not.toContain(source)
    }
  })

  it('handles nested block comments and escaped quoted content deterministically', () => {
    const source = [
      "/* outer COPY x TO PROGRAM 'x'; /* nested \\! x */ still comment */",
      "SELECT E'quoted \\\' COPY x FROM PROGRAM';",
      'SELECT "quoted ""COPY x TO PROGRAM""";',
      'SELECT 1;',
    ].join('\n')
    expect(validateSqlArtifactSafety(source, 'schema.sql')).toBe(true)
    expect(validateSqlArtifactSafety(source, 'schema.sql')).toBe(true)
  })

  it('blocks a connect meta-command only when it is executable', () => {
    expect(() => validateSqlArtifactSafety('\\connect remote', 'schema.sql'))
      .toThrow(expect.objectContaining({
        restoreReport: expect.objectContaining({ classification: 'UNSAFE_PSQL_CONNECT_COMMAND' }),
      }))
    expect(validateSqlArtifactSafety("SELECT '\\connect remote';", 'schema.sql')).toBe(true)
  })

  it('parses COPY after an allowed psql meta-command line', () => {
    expect(() => validateSqlArtifactSafety(
      "\\set example value\nCOPY public.items TO PROGRAM 'processor';",
      'schema.sql',
    )).toThrow(expect.objectContaining({
      restoreReport: expect.objectContaining({ classification: 'UNSAFE_COPY_PROGRAM' }),
    }))
  })

  it('keeps the roles contract fail-closed on incomplete quoting', () => {
    expect(() => prepareOfficialCliRoleGrant("SELECT 'unclosed"))
      .toThrow(expect.objectContaining({
        restoreReport: expect.objectContaining({ classification: 'SQL_LEXING_INCOMPLETE' }),
      }))
  })

  it('detects divergent fingerprints, counts and owners', () => {
    const base = {
      fingerprint: 'a',
      counts: { rows: 1 },
      owners: { auth: 'supabase_admin' },
      inventoryStatuses: { auth: 'PRESENT' },
    }
    expect(() => compareRestoreProofs(base, { ...base, fingerprint: 'b' }))
      .toThrow(/fingerprints/)
    expect(() => compareRestoreProofs(base, { ...base, counts: { rows: 2 } }))
      .toThrow(/counts/)
    expect(() => compareRestoreProofs(base, { ...base, owners: { auth: 'postgres' } }))
      .toThrow(/ownership/)
    expect(() => compareRestoreProofs(base, {
      ...base,
      inventoryStatuses: { auth: 'ERROR' },
    })).toThrow(/inventory statuses/)
  })

  it('accepts deterministic restore proofs', () => {
    const proof = { fingerprint: 'a', counts: { rows: 1 }, owners: { auth: 'supabase_admin' } }
    expect(compareRestoreProofs(proof, structuredClone(proof))).toBe(true)
  })

  it('always cleans up after success', async () => {
    const events: string[] = []
    await expect(withGuaranteedCleanup(async () => {
      events.push('operation')
      return 'ok'
    }, async () => { events.push('cleanup') })).resolves.toBe('ok')
    expect(events).toEqual(['operation', 'cleanup'])
  })

  it('always cleans up after failure', async () => {
    const events: string[] = []
    await expect(withGuaranteedCleanup(async () => {
      events.push('operation')
      throw new Error('synthetic failure')
    }, async () => { events.push('cleanup') })).rejects.toThrow(/synthetic failure/)
    expect(events).toEqual(['operation', 'cleanup'])
  })

  it('contains no network client, environment loading or remote mutation command', async () => {
    const source = await import('node:fs').then(({ readFileSync }) => readFileSync(
      resolve(process.cwd(), 'scripts/preproduction/restore-staging-backup-locally.mjs'),
      'utf8',
    ))
    expect(source).not.toMatch(/node:(?:http|https|net|tls)|fetch\(|axios|undici|WebSocket/)
    expect(source).not.toMatch(/process\.env|dotenv|loadEnv|\.env\b/)
    expect(source).not.toMatch(/execute\([^\n]+(?:db\s+push|migration\s+repair)/)
    expect(source).not.toMatch(/execute\(supabaseCli,\s*\[[^\]]*['"](?:--linked|--prod)['"]/)
    expect(source).toContain("'-U', 'supabase_admin'")
    expect(source).toContain('OFFICIAL_REALTIME_PARAMETER_GRANT')
  })
})
