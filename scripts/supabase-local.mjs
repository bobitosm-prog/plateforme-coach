import { chmodSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const configPath = resolve(root, 'supabase/config.toml')
const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
const requiredLocalValues = [
  'port = 55321',
  'port = 55322',
  'port = 55324',
  'smtp_port = 55325',
  'site_url = "http://127.0.0.1:3210"',
]

function assertLocalConfiguration() {
  const config = readFileSync(configPath, 'utf8')
  const activeConfig = config.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n')
  const urls = activeConfig.match(/https?:\/\/[^"\s,\]]+/g) || []
  if (urls.some(value => !['127.0.0.1', 'localhost'].includes(new URL(value).hostname))) {
    throw new Error('Refusing non-local URL in Supabase config')
  }
  for (const value of requiredLocalValues) {
    if (!config.includes(value)) throw new Error(`Missing required local config: ${value}`)
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  })
  if (result.status !== 0) {
    if (options.capture) process.stderr.write(result.stderr || '')
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
  return result.stdout || ''
}

function writeLocalEnvironment() {
  const output = run('npx', ['supabase', 'status', '-o', 'env'], { capture: true })
  if (!output.includes('API_URL="http://127.0.0.1:55321"')) {
    throw new Error('Supabase status did not return the expected local API URL')
  }
  const path = resolve(root, '.env.e2e.local')
  writeFileSync(path, output, { mode: 0o600 })
  chmodSync(path, 0o600)
}

function applyMigrations() {
  const migrations = readdirSync(resolve(root, 'supabase/migrations'))
    .filter(name => name.endsWith('.sql'))
    .sort()

  run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c',
    'CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE IF NOT EXISTS supabase_migrations.local_applied_files (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'])

  for (const filename of migrations) {
    run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', resolve(root, 'supabase/migrations', filename)])
    const safe = filename.replace(/'/g, "''")
    run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c',
      `INSERT INTO supabase_migrations.local_applied_files(filename) VALUES ('${safe}') ON CONFLICT DO NOTHING`])
  }
}

assertLocalConfiguration()
const action = process.argv[2]

if (action === 'start') {
  run('npx', ['supabase', 'start'], { capture: true })
  writeLocalEnvironment()
  console.log('Supabase local started: API 55321, PostgreSQL 55322, Mailpit 55324/55325')
} else if (action === 'status') {
  const output = run('npx', ['supabase', 'status', '-o', 'env'], { capture: true })
  if (!output.includes('API_URL="http://127.0.0.1:55321"')) throw new Error('Local Supabase stack is unavailable')
  console.log('Supabase local healthy: API 55321, PostgreSQL 55322, Mailpit 55324/55325')
} else if (action === 'reset') {
  run('npx', ['supabase', 'db', 'reset', '--no-seed'])
  applyMigrations()
  writeLocalEnvironment()
} else if (action === 'stop') {
  run('npx', ['supabase', 'stop'])
} else {
  throw new Error('Expected one of: start, status, reset, stop')
}
