// Local disposable integration test; never loads .env files or production data.
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const suffix = randomBytes(5).toString('hex')
const network = `moovx-nutrition-test-${suffix}`
const database = `${network}-db`
const rest = `${network}-rest`
const secret = randomBytes(48).toString('hex')
const created = []
let stage = 'network'
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
async function ready(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await check()) return } catch { /* startup only */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Disposable test service did not become ready')
}
try {
  docker('network', 'create', network)
  created.push(network)
  stage = 'database'
  docker('run', '-d', '--name', database, '--network', network,
    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine')
  created.push(database)
  await ready(() => { docker('exec', database, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'); return true })
  stage = 'fixture'
  execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: readFileSync(new URL('../tests/integration/nutrition-persistence-fixture.sql', import.meta.url)),
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  // Secret is generated per run, passed in process environment, never printed.
  stage = 'rest'
  execFileSync('docker', ['run', '-d', '--name', rest, '--network', network,
    '-p', '127.0.0.1:56431:3000', '-e', `PGRST_DB_URI=postgres://authenticator@${database}:5432/postgres`,
    '-e', 'PGRST_DB_SCHEMAS=public,canonical', '-e', 'PGRST_JWT_SECRET',
    'public.ecr.aws/supabase/postgrest:v14.14'], {
    env: { ...process.env, PGRST_JWT_SECRET: secret }, stdio: ['pipe', 'pipe', 'pipe'],
  })
  created.push(rest)
  await ready(async () => [401, 403].includes((await fetch('http://127.0.0.1:56431', { signal: AbortSignal.timeout(1000) })).status))
  stage = 'tests'
  const result = spawnSync('npx', ['vitest', 'run', '--config', 'vitest.nutrition-integration.config.ts'], {
    env: { ...process.env, NUTRITION_TEST_JWT_SECRET: secret }, stdio: 'inherit',
  })
  process.exitCode = result.status ?? 1
} catch (error) {
  console.error(`Isolated nutrition persistence check failed at ${stage}; no production service was used.`)
  if (stage === 'fixture') console.error(String(error.stderr ?? 'Fixture error'))
  process.exitCode = 1
} finally {
  for (const name of [rest, database]) if (created.includes(name)) docker('rm', '-f', '-v', name)
  if (created.includes(network)) docker('network', 'rm', network)
  console.log('Disposable synthetic test containers, volumes and network removed.')
}
