#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PRIMARY_LOCAL_PORTS = Object.freeze([
  3000, 3001, 3210, 55320, 55321, 55322, 55323, 55324, 55325, 55327, 54329,
])
export const REQUIRED_BACKUP_FILES = Object.freeze([
  'roles.sql',
  'schema.sql',
  'data.sql',
  'history_schema.sql',
  'history_data.sql',
])
export const OFFICIAL_CLI_ROLE_GRANT =
  'GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const supabaseCli = resolve(repositoryRoot, 'node_modules/.bin/supabase')
const dockerBinary = '/usr/local/bin/docker'
const sourceConfigPath = resolve(repositoryRoot, 'supabase/config.toml')
const allowedPath = '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'
const runPorts = Object.freeze([
  Object.freeze({ shadow: 61520, api: 61521, db: 61522, studio: 61523, mailpit: 61524, smtp: 61525, analytics: 61527, pooler: 61529, site: 61500, e2e: 61510 }),
  Object.freeze({ shadow: 61620, api: 61621, db: 61622, studio: 61623, mailpit: 61624, smtp: 61625, analytics: 61627, pooler: 61629, site: 61600, e2e: 61610 }),
])

const SECRET_PATTERN =
  /(?:\bBearer\s+\S+|\b(?:sbp|eyJ|sk_live|sk_test|whsec)_\S+|(?:password|secret|token|cookie|credential)\s*[=:]\s*\S+|postgres(?:ql)?:\/\/\S+)/gi

function assertLocalPath(value, label) {
  const path = resolve(value)
  const allowedTemporaryRoots = [resolve(tmpdir()), '/private/tmp']
  if (path === repositoryRoot
    || !allowedTemporaryRoots.some(root => path.startsWith(`${root}/`))) {
    throw new Error(`${label} must be inside a dedicated temporary directory`)
  }
  return path
}

export function assertSafeRestoreArgs(argv) {
  const forbidden = ['--linked', '--prod', '--no-owner', '--db-url', '--password']
  for (const flag of forbidden) {
    if (argv.includes(flag)) throw new Error(`${flag} is forbidden`)
  }
  const allowed = new Set(['--backup-dir', '--runs'])
  const values = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!allowed.has(key) || !value || value.startsWith('--')) {
      throw new Error(`Unsupported or incomplete argument: ${key || '<empty>'}`)
    }
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate argument: ${key}`)
    values[key] = value
  }
  if (!values['--backup-dir']) throw new Error('--backup-dir is required')
  try {
    const parsed = new URL(values['--backup-dir'])
    if (parsed.protocol) throw new Error('Remote backup URL is forbidden')
  } catch (error) {
    if (error instanceof Error && error.message === 'Remote backup URL is forbidden') throw error
  }
  const runs = Number(values['--runs'] ?? '2')
  if (runs !== 2) throw new Error('Exactly two independent restore runs are required')
  return { backupDirectory: assertLocalPath(values['--backup-dir'], 'backup directory'), runs }
}

export function validateBackupDirectory(directory) {
  const root = assertLocalPath(directory, 'backup directory')
  if (!statSync(root).isDirectory()) throw new Error('Backup path is not a directory')
  const names = readdirSync(root).filter(name => name.endsWith('.sql')).sort()
  if (JSON.stringify(names) !== JSON.stringify([...REQUIRED_BACKUP_FILES].sort())) {
    throw new Error('Backup file set is incomplete or unexpected')
  }
  const files = Object.fromEntries(REQUIRED_BACKUP_FILES.map(name => {
    const path = resolve(root, name)
    const metadata = statSync(path)
    if (!metadata.isFile() || metadata.size === 0) throw new Error(`Backup file is empty: ${name}`)
    const source = readFileSync(path, 'utf8')
    if (/\\connect\b|\\!|COPY\s+.+PROGRAM/i.test(source)) {
      throw new Error(`Unsafe backup command detected: ${name}`)
    }
    return [name, { path, source, sizeBytes: metadata.size }]
  }))
  return { root, files }
}

export function neutralizeUnsupportedCliRoleGrant(source) {
  const occurrences = source.split(OFFICIAL_CLI_ROLE_GRANT).length - 1
  if (occurrences !== 1) {
    throw new Error('Expected exactly one official cli_login_postgres grant')
  }
  const result = source.replace(
    OFFICIAL_CLI_ROLE_GRANT,
    '-- Local restore: official Supabase cli_login_postgres grant omitted.',
  )
  if (/GRANT\s+"postgres"\s+TO\s+"cli_login_postgres"/i.test(result)) {
    throw new Error('Unsupported cli_login_postgres grant remains')
  }
  return result
}

export function buildCanonicalRestoreSql(files) {
  const roles = neutralizeUnsupportedCliRoleGrant(files['roles.sql'].source)
  return [
    '\\set ON_ERROR_STOP on',
    'BEGIN;',
    roles,
    files['schema.sql'].source,
    'SET session_replication_role = replica;',
    files['data.sql'].source,
    files['history_schema.sql'].source,
    files['history_data.sql'].source,
    'COMMIT;',
  ].join('\n')
}

function operationFromError(message) {
  const match = message.match(/(?:STATEMENT|statement):\s*([^\n]+)/i)
  const statement = match?.[1]?.trim() ?? ''
  if (/^GRANT\b/i.test(statement)) return 'GRANT'
  if (/^ALTER\s+.+OWNER\b/i.test(statement)) return 'ALTER OWNER'
  if (/^SET\s+ROLE\b/i.test(statement)) return 'SET ROLE'
  if (/^CREATE\s+EXTENSION\b/i.test(statement)) return 'CREATE EXTENSION'
  if (/^ALTER\s+PUBLICATION\b/i.test(statement)) return 'ALTER PUBLICATION'
  return 'UNKNOWN'
}

export function sanitizeRestoreError(raw, phase = 'restore') {
  const message = String(raw)
  const sqlstate = message.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]
    ?? message.match(/SQLSTATE\s+([0-9A-Z]{5})/)?.[1]
    ?? 'UNKNOWN'
  const schema = message.match(/schema\s+"?([a-z_][a-z0-9_]*)"?/i)?.[1] ?? null
  const objectType = message.match(/(?:table|function|schema|role|publication|extension)\s+"?[^\s"]+/i)?.[0]?.split(/\s+/)[0]?.toUpperCase() ?? 'UNKNOWN'
  const classification = sqlstate === '42501'
    ? 'INSUFFICIENT_PRIVILEGE'
    : sqlstate === '42704'
      ? 'MISSING_OBJECT'
      : sqlstate === '42710'
        ? 'DUPLICATE_OBJECT'
        : sqlstate === '2BP01'
          ? 'DEPENDENT_OBJECTS'
          : 'RESTORE_ERROR'
  const sanitized = message.replace(SECRET_PATTERN, '<redacted>')
  return {
    phase,
    sqlstate,
    operation: operationFromError(sanitized),
    objectType,
    schema,
    classification,
    sensitiveDetailRemoved: sanitized !== message,
  }
}

export async function withGuaranteedCleanup(operation, cleanup) {
  try {
    return await operation()
  } finally {
    await cleanup()
  }
}

export function assertIsolatedTarget({ projectId, ports, temporaryRoot }) {
  if (!/^moovx-staging-restore-[a-z0-9-]+$/.test(projectId)) {
    throw new Error('Isolated project ID is invalid')
  }
  const values = Object.values(ports)
  if (new Set(values).size !== values.length) throw new Error('Isolated ports must be unique')
  if (values.some(port => PRIMARY_LOCAL_PORTS.includes(port))) {
    throw new Error('Primary local port is forbidden')
  }
  assertLocalPath(temporaryRoot, 'restore worktree')
}

export function compareRestoreProofs(first, second) {
  if (first.fingerprint !== second.fingerprint) throw new Error('Restore fingerprints differ')
  if (JSON.stringify(first.counts) !== JSON.stringify(second.counts)) {
    throw new Error('Restore counts differ')
  }
  if (JSON.stringify(first.owners) !== JSON.stringify(second.owners)) {
    throw new Error('Restore ownership differs')
  }
  return true
}

function configFor(projectId, ports) {
  const replacements = new Map([
    [55320, ports.shadow], [55321, ports.api], [55322, ports.db], [55323, ports.studio],
    [55324, ports.mailpit], [55325, ports.smtp], [55327, ports.analytics], [54329, ports.pooler],
    [3000, ports.site], [3210, ports.e2e],
  ])
  let config = readFileSync(sourceConfigPath, 'utf8')
    .replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${projectId}"`)
  for (const [current, replacement] of replacements) {
    config = config.replace(new RegExp(`\\b${current}\\b`, 'g'), String(replacement))
  }
  return config.replace(/(\[db\.seed\][\s\S]*?enabled\s*=\s*)true/, '$1false')
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    input: options.input,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    env: { PATH: allowedPath, SUPABASE_TELEMETRY_DISABLED: '1' },
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    const error = new Error(`${options.label ?? basename(command)} failed`)
    error.restoreReport = sanitizeRestoreError(
      `${result.stdout || ''}\n${result.stderr || ''}`,
      options.phase ?? 'restore',
    )
    throw error
  }
  return options.allowOutput ? (result.stdout || '') : ''
}

function docker(args, options) {
  return execute(dockerBinary, args, { label: 'docker', ...options })
}

function resources(projectId) {
  const containers = docker(
    ['ps', '-a', '--filter', `name=${projectId}`, '--format', '{{.Names}}'],
    { allowOutput: true, phase: 'resource_inventory' },
  ).trim().split('\n').filter(Boolean).sort()
  const volumes = docker(
    ['volume', 'ls', '--filter', `name=${projectId}`, '--format', '{{.Name}}'],
    { allowOutput: true, phase: 'resource_inventory' },
  ).trim().split('\n').filter(Boolean).sort()
  return { containers, volumes }
}

function forceCleanup(projectId) {
  const current = resources(projectId)
  if (current.containers.length) docker(['rm', '-f', ...current.containers], { phase: 'cleanup' })
  if (current.volumes.length) docker(['volume', 'rm', ...current.volumes], { phase: 'cleanup' })
}

function inventory(container) {
  const sql = `
SELECT json_build_object(
  'counts', json_build_object(
    'publicTables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
    'authUsers', (SELECT count(*) FROM auth.users),
    'storageObjects', (SELECT count(*) FROM storage.objects),
    'migrationHistory', (SELECT count(*) FROM supabase_migrations.schema_migrations)
  ),
  'owners', json_build_object(
    'auth', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='auth'),
    'storage', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='storage'),
    'realtime', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='realtime')
  ),
  'fixturePresent', to_regclass('restore_fixture.items') IS NOT NULL,
  'fingerprint', md5((SELECT string_agg(item, E'\\n' ORDER BY item) FROM (
    SELECT concat('c|',table_schema,'|',table_name,'|',column_name,'|',data_type,'|',is_nullable,'|',coalesce(column_default,'')) item FROM information_schema.columns WHERE table_schema IN ('public','auth','storage','supabase_migrations','restore_fixture')
    UNION ALL SELECT concat('k|',n.nspname,'|',c.relname,'|',co.conname,'|',pg_get_constraintdef(co.oid)) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('i|',schemaname,'|',tablename,'|',indexname,'|',indexdef) FROM pg_indexes WHERE schemaname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('p|',schemaname,'|',tablename,'|',policyname,'|',cmd,'|',coalesce(qual,''),'|',coalesce(with_check,'')) FROM pg_policies WHERE schemaname IN ('public','auth','storage','restore_fixture')
    UNION ALL SELECT concat('r|',pubname,'|',schemaname,'|',tablename) FROM pg_publication_tables
    UNION ALL SELECT concat('o|',nspname,'|',pg_get_userbyid(nspowner)) FROM pg_namespace WHERE nspname IN ('public','auth','storage','realtime','restore_fixture')
  ) fingerprint_items))
)::text;`
  const output = docker(
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, allowOutput: true, phase: 'inventory' },
  ).trim()
  const report = JSON.parse(output)
  if (report.fixturePresent) {
    const fixtureSql = `
SELECT json_build_object(
  'rowCount', (SELECT count(*) FROM restore_fixture.items),
  'schemaOwner', (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='restore_fixture'),
  'tableOwner', (SELECT tableowner FROM pg_tables WHERE schemaname='restore_fixture' AND tablename='items'),
  'rlsEnabled', (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='restore_fixture' AND c.relname='items'),
  'policyCount', (SELECT count(*) FROM pg_policies WHERE schemaname='restore_fixture' AND tablename='items'),
  'securityDefiner', (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='restore_fixture' AND p.proname='item_count'),
  'publicationCount', (SELECT count(*) FROM pg_publication_tables WHERE pubname='fixture_restore_publication' AND schemaname='restore_fixture' AND tablename='items'),
  'fixtureRolePresent', EXISTS (SELECT 1 FROM pg_roles WHERE rolname='fixture_restore_owner'),
  'cliRolePresent', EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cli_login_postgres'),
  'unsupportedMembershipCount', (SELECT count(*) FROM pg_auth_members m JOIN pg_roles role ON role.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE role.rolname='postgres' AND member.rolname='cli_login_postgres')
)::text;`
    report.fixture = JSON.parse(docker(
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1'],
      { input: fixtureSql, allowOutput: true, phase: 'fixture_inventory' },
    ).trim())
  }
  return report
}

async function restoreOnce({ backup, runNumber, ports }) {
  const nonce = `${process.pid}-${Date.now().toString(36)}-${runNumber}`
  const projectId = `moovx-staging-restore-${nonce}`
  const temporaryRoot = mkdtempSync(join(tmpdir(), `moovx-staging-restore-run-${runNumber}-`))
  assertIsolatedTarget({ projectId, ports, temporaryRoot })
  const projectRoot = resolve(temporaryRoot, 'project')
  const configRoot = resolve(projectRoot, 'supabase')
  const container = `supabase_db_${projectId}`
  const volume = `supabase_db_${projectId}`
  mkdirSync(resolve(configRoot, 'migrations'), { recursive: true, mode: 0o700 })
  writeFileSync(resolve(configRoot, 'config.toml'), configFor(projectId, ports), { mode: 0o600 })
  chmodSync(temporaryRoot, 0o700)
  let proof
  await withGuaranteedCleanup(async () => {
    if (resources(projectId).containers.length || resources(projectId).volumes.length) {
      throw new Error('Isolated Docker resource collision')
    }
    execute(supabaseCli, ['start'], { cwd: projectRoot, phase: 'stack_start' })
    if (!resources(projectId).containers.includes(container)
      || !resources(projectId).volumes.includes(volume)) {
      throw new Error('Expected isolated database resources are missing')
    }
    const restoreSql = buildCanonicalRestoreSql(backup.files)
    docker(
      ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
      { input: restoreSql, phase: 'canonical_restore' },
    )
    const restored = inventory(container)
    if (restored.owners.auth !== 'supabase_admin'
      || restored.owners.storage !== 'supabase_admin'
      || restored.owners.realtime !== 'supabase_admin') {
      throw new Error('Supabase-managed schema ownership changed')
    }
    if (restored.fixturePresent
      && (Number(restored.fixture.rowCount) !== 2
        || restored.fixture.schemaOwner !== 'postgres'
        || restored.fixture.tableOwner !== 'postgres'
        || restored.fixture.rlsEnabled !== true
        || Number(restored.fixture.policyCount) !== 1
        || restored.fixture.securityDefiner !== true
        || Number(restored.fixture.publicationCount) !== 1
        || restored.fixture.fixtureRolePresent !== true
        || restored.fixture.cliRolePresent !== true
        || Number(restored.fixture.unsupportedMembershipCount) !== 0)) {
      throw new Error('Synthetic restore contract mismatch')
    }
    proof = {
      runNumber,
      projectId,
      databasePort: ports.db,
      volume,
      fingerprint: restored.fingerprint,
      counts: restored.counts,
      owners: restored.owners,
    }
  }, async () => {
    try { execute(supabaseCli, ['stop', '--no-backup'], { cwd: projectRoot, phase: 'stack_stop' }) } catch {}
    forceCleanup(projectId)
    chmodSync(temporaryRoot, 0o700)
    rmSync(temporaryRoot, { recursive: true, force: true })
    const remaining = resources(projectId)
    if (remaining.containers.length || remaining.volumes.length) {
      throw new Error('Isolated cleanup incomplete')
    }
  })
  return proof
}

export async function restoreBackupTwice(backupDirectory) {
  const backup = validateBackupDirectory(backupDirectory)
  const proofs = []
  for (let index = 0; index < runPorts.length; index += 1) {
    proofs.push(await restoreOnce({ backup, runNumber: index + 1, ports: runPorts[index] }))
  }
  compareRestoreProofs(proofs[0], proofs[1])
  return {
    status: 'RESTORABLE',
    restoreRuns: proofs,
    fingerprintsIdentical: true,
    countsIdentical: true,
    ownershipIdentical: true,
    sourceDumpModified: false,
    remoteAccess: false,
  }
}

async function main() {
  const { backupDirectory } = assertSafeRestoreArgs(process.argv.slice(2))
  const report = await restoreBackupTwice(backupDirectory)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const report = error?.restoreReport ?? {
      phase: 'harness',
      sqlstate: 'UNKNOWN',
      operation: 'UNKNOWN',
      objectType: 'UNKNOWN',
      schema: null,
      classification: 'HARNESS_FAILURE',
      sensitiveDetailRemoved: false,
    }
    process.stderr.write(`${JSON.stringify(report)}\n`)
    process.exitCode = 1
  })
}
