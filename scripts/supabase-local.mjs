import { chmodSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  LOCAL_API_URL, LOCAL_DB_URL, LOCAL_MAILPIT_URL, acquireLock, assertLocalUrl,
  assertMigrationOrder, assertNoRemoteProject, localResetLockPath,
} from './supabase-local-contract.mjs'

const root = resolve(import.meta.dirname, '..')
const configPath = resolve(root, 'supabase/config.toml')
const supabaseCli = resolve(root, 'node_modules/.bin/supabase')
const migrationsDirectory = resolve(root, 'supabase/migrations')
const requiredLocalValues = ['port = 55321', 'port = 55322', 'port = 55324', 'smtp_port = 55325', 'site_url = "http://127.0.0.1:3210"']

function assertLocalConfiguration() {
  assertLocalUrl(LOCAL_API_URL, 'Supabase API URL')
  assertLocalUrl(LOCAL_DB_URL, 'PostgreSQL URL')
  assertLocalUrl(LOCAL_MAILPIT_URL, 'Mailpit URL')
  assertNoRemoteProject(process.env)
  const config = readFileSync(configPath, 'utf8')
  const activeConfig = config.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n')
  const urls = activeConfig.match(/https?:\/\/[^"\s,\]]+/g) || []
  if (urls.some(value => !['127.0.0.1', 'localhost'].includes(new URL(value).hostname))) throw new Error('Refusing non-local URL in Supabase config')
  for (const value of requiredLocalValues) if (!config.includes(value)) throw new Error(`Missing required local config: ${value}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  })
  if (result.status !== 0) {
    if (options.capture) process.stderr.write(result.stderr || result.stdout || '')
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
  return result.stdout || ''
}

function supabase(args, options) { return run(supabaseCli, args, options) }
function psql(args, options = { capture: true }) { return run('psql', [LOCAL_DB_URL, '-v', 'ON_ERROR_STOP=1', ...args], options) }

function localStatus() {
  const output = supabase(['status', '-o', 'env'], { capture: true })
  if (!output.includes(`API_URL="${LOCAL_API_URL}"`)) throw new Error('Supabase CLI did not return the expected local API URL')
  return output
}

function ensureStarted() {
  try { return localStatus() } catch {
    console.log('Local Supabase stack is stopped; starting canonical local services…')
    supabase(['start'], { capture: true })
    return localStatus()
  }
}

function writeLocalEnvironment(output = localStatus()) {
  const path = resolve(root, '.env.e2e.local')
  writeFileSync(path, output, { mode: 0o600 })
  chmodSync(path, 0o600)
}

function migrationFiles() {
  return readdirSync(migrationsDirectory).filter(name => name.endsWith('.sql')).sort()
}

function applyMigrations() {
  const migrations = migrationFiles()
  psql(['-c', 'CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE supabase_migrations.local_applied_files (ordinal integer PRIMARY KEY, filename text UNIQUE NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'], { capture: false })
  migrations.forEach((filename, index) => {
    psql(['-f', resolve(migrationsDirectory, filename)], { capture: false })
    if (!/^[0-9A-Za-z_.-]+\.sql$/.test(filename)) throw new Error(`Unsafe migration filename: ${filename}`)
    psql(['-c', `INSERT INTO supabase_migrations.local_applied_files(ordinal, filename) VALUES (${index + 1}, '${filename}')`], { capture: false })
  })
  verifyMigrations(migrations)
  console.log(`Applied ${migrations.length}/${migrations.length} migrations in lexical filename order`)
}

function appliedMigrations() {
  return psql(['-Atq', '-c', 'SELECT filename FROM supabase_migrations.local_applied_files ORDER BY ordinal'])
    .trim().split('\n').filter(Boolean)
}

function verifyMigrations(expected = migrationFiles()) { assertMigrationOrder(expected, appliedMigrations()) }

function runAssertions({ clean = false } = {}) {
  psql(['-f', resolve(root, 'tests/integration/supabase-baseline-assertions.sql')], { capture: false })
  if (clean) psql(['-f', resolve(root, 'tests/integration/supabase-reset-assertions.sql')], { capture: false })
}

async function clearMailpit() {
  const response = await fetch(`${LOCAL_MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`Mailpit cleanup failed with HTTP ${response.status}`)
}

function fingerprint() {
  verifyMigrations()
  return psql(['-Atq', '-f', resolve(root, 'tests/integration/supabase-fingerprint.sql')]).trim()
}

async function canonicalReset() {
  const release = acquireLock(localResetLockPath(root))
  try {
    run('docker', ['info'], { capture: true })
    ensureStarted()
    supabase(['db', 'reset', '--no-seed'])
    applyMigrations()
    runAssertions({ clean: true })
    await clearMailpit()
    writeLocalEnvironment()
    console.log(`Canonical Supabase reset fingerprint: ${fingerprint()}`)
  } finally { release() }
}

assertLocalConfiguration()
const action = process.argv[2]

if (action === 'start') {
  run('docker', ['info'], { capture: true }); ensureStarted(); writeLocalEnvironment()
  console.log('Supabase local started: API 55321, PostgreSQL 55322, Mailpit 55324/55325')
} else if (action === 'status') {
  localStatus(); verifyMigrations()
  console.log('Supabase local healthy and migration contract current')
} else if (action === 'ensure') {
  ensureStarted(); verifyMigrations(); writeLocalEnvironment()
} else if (action === 'verify') {
  localStatus(); verifyMigrations(); runAssertions()
  console.log(`Canonical Supabase contract verified (${migrationFiles().length} migrations, fingerprint ${fingerprint()})`)
} else if (action === 'fingerprint') {
  localStatus(); console.log(fingerprint())
} else if (action === 'reset') {
  await canonicalReset()
} else if (action === 'stop') {
  supabase(['stop'])
} else {
  throw new Error('Expected one of: start, status, ensure, verify, fingerprint, reset, stop')
}
