import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { assertMigrationOrder, assertNoRemoteProject, assertLocalUrl } from './supabase-local-contract.mjs'
import { createStagingMigrationManifest } from './preproduction/staging-migration-manifest.mjs'

const root = resolve(import.meta.dirname, '..')
const migrationsDirectory = resolve(root, 'supabase/migrations')
const manifestPath = resolve(root, 'scripts/preproduction/staging-migration-manifest.json')
const supabaseCli = resolve(root, 'node_modules/.bin/supabase')
const sourceConfigPath = resolve(root, 'supabase/config.toml')

export const EXPECTED_MIGRATION_COUNT = 149
export const PRIMARY_PROJECT_ID = 'plateforme-coach'
export const PRIMARY_PORTS = Object.freeze([55320, 55321, 55322, 55323, 55324, 55325, 55327, 54329])

const RUN_PORTS = Object.freeze([
  Object.freeze({ shadow: 60320, api: 60321, db: 60322, studio: 60323, mailpit: 60324, smtp: 60325, analytics: 60327, pooler: 60329, site: 60300, e2e: 60310 }),
  Object.freeze({ shadow: 61320, api: 61321, db: 61322, studio: 61323, mailpit: 61324, smtp: 61325, analytics: 61327, pooler: 61329, site: 61300, e2e: 61310 }),
])

function run(command, args, { cwd = root, label = command } = {}) {
  assertSafeSupabaseArgs(args)
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  })
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`)
  return result.stdout || ''
}

function psql(databaseUrl, args, label) {
  assertLocalUrl(databaseUrl, 'isolated PostgreSQL URL')
  return run('psql', [databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1', ...args], { label })
}

function docker(args, label = 'Docker command') {
  return run('docker', args, { label })
}

export function assertSafeSupabaseArgs(args) {
  if (args.includes('--linked')) throw new Error('Refusing Supabase --linked in empty-database verification')
}

export function assertIsolatedTarget({ projectId, ports, temporaryRoot }) {
  if (!projectId || projectId === PRIMARY_PROJECT_ID) throw new Error('Refusing primary Supabase project_id')
  if (!/^moovx-empty-db-[a-z0-9-]+$/.test(projectId)) throw new Error('Isolated project_id does not match the dedicated prefix')
  const values = Object.values(ports)
  if (new Set(values).size !== values.length) throw new Error('Isolated ports must be unique')
  const shared = values.filter(port => PRIMARY_PORTS.includes(port))
  if (shared.length) throw new Error(`Refusing primary Supabase ports: ${shared.join(', ')}`)
  const resolvedTemporaryRoot = resolve(temporaryRoot)
  const allowedTemporaryRoot = resolve(tmpdir())
  if (resolvedTemporaryRoot === root || !resolvedTemporaryRoot.startsWith(`${allowedTemporaryRoot}/`)) {
    throw new Error('Isolated stack must use a dedicated temporary directory')
  }
}

export function canonicalMigrationInventory() {
  const files = readdirSync(migrationsDirectory).filter(name => name.endsWith('.sql')).sort()
  const generated = createStagingMigrationManifest(migrationsDirectory)
  const versioned = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const generatedNames = generated.migrations.map(item => item.historicalName)
  const versionedNames = versioned.migrations.map(item => item.historicalName)
  if (files.length !== EXPECTED_MIGRATION_COUNT) {
    throw new Error(`Migration count mismatch: expected ${EXPECTED_MIGRATION_COUNT}, found ${files.length}`)
  }
  if (versioned.sourceMigrationCount !== EXPECTED_MIGRATION_COUNT || versioned.migrations.length !== EXPECTED_MIGRATION_COUNT) {
    throw new Error('Versioned staging manifest migration count mismatch')
  }
  assertMigrationOrder(files, generatedNames)
  assertMigrationOrder(files, versionedNames)
  for (let index = 0; index < generated.migrations.length; index += 1) {
    const current = generated.migrations[index]
    const expected = versioned.migrations[index]
    if (current.sourceSha256 !== expected.sourceSha256 || current.stagingName !== expected.stagingName) {
      throw new Error(`Versioned staging manifest mismatch at ${current.historicalName}`)
    }
  }
  if (new Set(files).size !== files.length) throw new Error('Duplicate migration filename detected')
  return files
}

export function compareRebuildProofs(first, second) {
  if (first.migrationCount !== second.migrationCount) throw new Error('Rebuild migration counts differ')
  assertMigrationOrder(first.migrations, second.migrations)
  if (first.fingerprint !== second.fingerprint) throw new Error('Rebuild fingerprints differ')
  if (!first.assertionsPassed || !second.assertionsPassed) throw new Error('Rebuild assertions did not pass')
  if (!first.clean || !second.clean) throw new Error('Rebuild left residual data')
  return true
}

export async function withGuaranteedCleanup(operation, cleanup) {
  try {
    return await operation()
  } finally {
    await cleanup()
  }
}

export function publicRebuildReport(proofs) {
  return {
    status: 'ok',
    migrationCount: proofs[0].migrationCount,
    fingerprintsIdentical: proofs[0].fingerprint === proofs[1].fingerprint,
    fingerprint: proofs[0].fingerprint,
    runs: proofs.map(proof => ({
      projectId: proof.projectId,
      databasePort: proof.databasePort,
      volume: proof.volume,
      durationMs: proof.durationMs,
      assertionsPassed: proof.assertionsPassed,
      clean: proof.clean,
      cleanupComplete: proof.cleanupComplete,
    })),
    primaryStackPreserved: true,
    remoteAccess: false,
  }
}

function isolatedConfig(source, projectId, ports) {
  const replacements = new Map([
    [55320, ports.shadow], [55321, ports.api], [55322, ports.db], [55323, ports.studio],
    [55324, ports.mailpit], [55325, ports.smtp], [55327, ports.analytics], [54329, ports.pooler],
    [3000, ports.site], [3210, ports.e2e],
  ])
  let config = source.replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${projectId}"`)
  for (const [current, replacement] of replacements) config = config.replace(new RegExp(`\\b${current}\\b`, 'g'), String(replacement))
  return config
}

function dockerResources(projectId) {
  const containers = docker(['ps', '-a', '--filter', `name=${projectId}`, '--format', '{{.ID}}|{{.Names}}'], 'Docker container inventory').trim().split('\n').filter(Boolean).sort()
  const volumes = docker(['volume', 'ls', '--filter', `name=${projectId}`, '--format', '{{.Name}}'], 'Docker volume inventory').trim().split('\n').filter(Boolean).sort()
  return { containers, volumes }
}

function primaryStackSnapshot() {
  return dockerResources(PRIMARY_PROJECT_ID)
}

async function clearAndAssertMailpit(port) {
  const url = `http://127.0.0.1:${port}`
  assertLocalUrl(url, 'isolated Mailpit URL')
  const deleted = await fetch(`${url}/api/v1/messages`, { method: 'DELETE' })
  if (!deleted.ok) throw new Error(`Isolated Mailpit cleanup failed with HTTP ${deleted.status}`)
  const response = await fetch(`${url}/api/v1/messages`)
  if (!response.ok) throw new Error(`Isolated Mailpit audit failed with HTTP ${response.status}`)
  const body = await response.json()
  const count = Array.isArray(body) ? body.length : (body.messages?.length || body.total || 0)
  if (count !== 0) throw new Error('Isolated Mailpit is not empty')
}

function applyMigrations(databaseUrl, migrations) {
  psql(databaseUrl, ['-c', 'CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE supabase_migrations.local_applied_files (ordinal integer PRIMARY KEY, filename text UNIQUE NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'], 'Create isolated migration ledger')
  migrations.forEach((filename, index) => {
    if (!/^[0-9A-Za-z_.-]+\.sql$/.test(filename)) throw new Error(`Unsafe migration filename: ${filename}`)
    psql(databaseUrl, ['-f', resolve(migrationsDirectory, filename)], `Migration ${filename}`)
    const escaped = filename.replaceAll("'", "''")
    psql(databaseUrl, ['-c', `INSERT INTO supabase_migrations.local_applied_files(ordinal, filename) VALUES (${index + 1}, '${escaped}')`], `Record migration ${filename}`)
  })
  const applied = psql(databaseUrl, ['-Atq', '-c', 'SELECT filename FROM supabase_migrations.local_applied_files ORDER BY ordinal'], 'Read isolated migration ledger').trim().split('\n').filter(Boolean)
  assertMigrationOrder(migrations, applied)
  return applied
}

async function rebuildOnce({ runNumber, projectId, ports, migrations }) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), `moovx-empty-db-run-${runNumber}-`))
  assertIsolatedTarget({ projectId, ports, temporaryRoot })
  const projectRoot = resolve(temporaryRoot, 'project')
  const configDirectory = resolve(projectRoot, 'supabase')
  const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${ports.db}/postgres`
  const expectedVolume = `supabase_db_${projectId}`
  mkdirSync(configDirectory, { recursive: true })
  writeFileSync(resolve(configDirectory, 'config.toml'), isolatedConfig(readFileSync(sourceConfigPath, 'utf8'), projectId, ports))
  const before = dockerResources(projectId)
  if (before.containers.length || before.volumes.length) throw new Error(`Isolated Docker resources already exist for ${projectId}`)
  const started = performance.now()
  let proof
  let cleanupComplete = false

  process.stdout.write(`${JSON.stringify({
    event: 'EMPTY_DATABASE_REBUILD_START',
    primaryProjectId: PRIMARY_PROJECT_ID,
    primaryDatabaseVolume: `supabase_db_${PRIMARY_PROJECT_ID}`,
    isolatedProjectId: projectId,
    isolatedDatabaseVolume: expectedVolume,
    primaryPorts: PRIMARY_PORTS,
    isolatedPorts: ports,
    temporaryRoot,
  })}\n`)

  await withGuaranteedCleanup(async () => {
    run('docker', ['info'], { label: 'Docker availability' })
    run(supabaseCli, ['start'], { cwd: projectRoot, label: `Start isolated Supabase run ${runNumber}` })
    const running = dockerResources(projectId)
    if (!running.volumes.includes(expectedVolume)) throw new Error(`Expected isolated database volume not found: ${expectedVolume}`)
    run(supabaseCli, ['db', 'reset', '--no-seed'], { cwd: projectRoot, label: `Reset isolated Supabase run ${runNumber}` })
    const applied = applyMigrations(databaseUrl, migrations)
    psql(databaseUrl, ['-f', resolve(root, 'tests/integration/supabase-baseline-assertions.sql')], 'Baseline assertions')
    psql(databaseUrl, ['-f', resolve(root, 'tests/integration/supabase-reset-assertions.sql')], 'Reset cleanliness assertions')
    await clearAndAssertMailpit(ports.mailpit)
    const fingerprint = psql(databaseUrl, ['-Atq', '-f', resolve(root, 'tests/integration/supabase-fingerprint.sql')], 'Schema fingerprint').trim()
    if (!/^[a-f0-9]{32}$/.test(fingerprint)) throw new Error('Invalid isolated schema fingerprint')
    proof = {
      projectId,
      databasePort: ports.db,
      volume: expectedVolume,
      migrations: applied,
      migrationCount: applied.length,
      fingerprint,
      assertionsPassed: true,
      clean: true,
      durationMs: Math.round(performance.now() - started),
    }
  }, async () => {
    try { run(supabaseCli, ['stop', '--no-backup'], { cwd: projectRoot, label: `Stop isolated Supabase run ${runNumber}` }) } catch {}
    rmSync(temporaryRoot, { recursive: true, force: true })
    const after = dockerResources(projectId)
    cleanupComplete = after.containers.length === 0 && after.volumes.length === 0
    if (!cleanupComplete) throw new Error(`Isolated cleanup incomplete for ${projectId}`)
  })

  return { ...proof, cleanupComplete }
}

async function main() {
  assertNoRemoteProject(process.env)
  assertSafeSupabaseArgs(process.argv.slice(2))
  const migrations = canonicalMigrationInventory()
  const primaryBefore = primaryStackSnapshot()
  if (!primaryBefore.containers.some(item => item.endsWith(`|supabase_db_${PRIMARY_PROJECT_ID}`))) {
    throw new Error('Primary Supabase stack must remain active and observable')
  }
  const nonce = `${process.pid}-${Date.now().toString(36)}`
  const proofs = []
  for (let index = 0; index < RUN_PORTS.length; index += 1) {
    proofs.push(await rebuildOnce({
      runNumber: index + 1,
      projectId: `moovx-empty-db-${nonce}-run-${index + 1}`,
      ports: RUN_PORTS[index],
      migrations,
    }))
  }
  compareRebuildProofs(proofs[0], proofs[1])
  const primaryAfter = primaryStackSnapshot()
  if (JSON.stringify(primaryAfter) !== JSON.stringify(primaryBefore)) throw new Error('Primary Supabase stack changed during isolated verification')
  process.stdout.write(`${JSON.stringify(publicRebuildReport(proofs), null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Empty-database rebuild verification failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
