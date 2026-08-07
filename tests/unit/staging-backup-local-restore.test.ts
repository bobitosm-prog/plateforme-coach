import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  OFFICIAL_CLI_ROLE_GRANT,
  PRIMARY_LOCAL_PORTS,
  REQUIRED_BACKUP_FILES,
  assertIsolatedTarget,
  assertSafeRestoreArgs,
  buildCanonicalRestoreSql,
  compareRestoreProofs,
  executeRestoreRuns,
  neutralizeUnsupportedCliRoleGrant,
  prepareOfficialCliRoleGrant,
  sanitizeRestoreError,
  validateBackupDirectory,
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
    'roles.sql': { source: `CREATE ROLE fixture_owner NOLOGIN;\n${OFFICIAL_CLI_ROLE_GRANT}\n` },
    'schema.sql': { source: 'CREATE SCHEMA restore_fixture AUTHORIZATION fixture_owner;' },
    'data.sql': { source: 'SET search_path TO restore_fixture;' },
    'history_schema.sql': { source: 'CREATE SCHEMA IF NOT EXISTS supabase_migrations;' },
    'history_data.sql': { source: 'SET search_path TO supabase_migrations;' },
    ...Object.fromEntries(Object.entries(overrides).map(([name, source]) => [name, { source }])),
  }
}

afterEach(() => {
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true })
  }
})

describe('staging backup local restore contract', () => {
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

  it.each([
    ['42501', 'ALTER TABLE public.items OWNER TO fixture_owner;', 'ALTER OWNER', 'INSUFFICIENT_PRIVILEGE'],
    ['42501', 'SET ROLE fixture_owner;', 'SET ROLE', 'INSUFFICIENT_PRIVILEGE'],
    ['42501', 'GRANT SELECT ON TABLE public.items TO fixture_owner;', 'GRANT', 'INSUFFICIENT_PRIVILEGE'],
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

  it('detects divergent fingerprints, counts and owners', () => {
    const base = { fingerprint: 'a', counts: { rows: 1 }, owners: { auth: 'supabase_admin' } }
    expect(() => compareRestoreProofs(base, { ...base, fingerprint: 'b' }))
      .toThrow(/fingerprints/)
    expect(() => compareRestoreProofs(base, { ...base, counts: { rows: 2 } }))
      .toThrow(/counts/)
    expect(() => compareRestoreProofs(base, { ...base, owners: { auth: 'postgres' } }))
      .toThrow(/ownership/)
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
  })
})
