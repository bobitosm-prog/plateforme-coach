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
  stage = 'profile trigger security'
  const guardFixture = readFileSync(new URL('../supabase/migrations/20260617120000_guard_profile_sensitive_columns.sql', import.meta.url))
  const triggerMigration = readFileSync(new URL('../supabase/migrations/20260919130017_harden_profile_trigger_search_paths.sql', import.meta.url))
  for (const input of [guardFixture, triggerMigration, triggerMigration,
    readFileSync(new URL('../tests/integration/profile-trigger-security.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
  console.log('Profile triggers: seven protected fields, safe nutrition edits and shadow-resistant timestamps passed.')
  stage = 'atomic activation migration and rollback tests'
  const roleMigration = readFileSync(new URL('../supabase/migrations/20260919112812_qualify_profile_role_lookup.sql', import.meta.url))
  for (const input of [roleMigration, roleMigration]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
  docker('exec', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `BEGIN READ ONLY; SET LOCAL search_path = ''; SELECT public.get_my_role(); ROLLBACK;`)
  const migration = readFileSync(new URL('../supabase/migrations/20260919110605_nutrition_atomic_activation.sql', import.meta.url))
  for (const input of [migration, migration, readFileSync(new URL('../tests/integration/nutrition-activation.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
  console.log('Atomic activation: idempotent migration, retries, stale snapshots, RLS and rollback checks passed.')
  // Exercise the same transaction on the alternate historical storage contract.
  const canonicalMigration = migration.toString().replaceAll('public.meal_plans', 'canonical.meal_plans')
    .replaceAll('public.activate_personal_meal_plan_v1', 'canonical.activate_personal_meal_plan_v1')
    .replaceAll('plan_data', 'plan').replaceAll('is_active', 'active')
  execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: canonicalMigration, stdio: ['pipe', 'pipe', 'pipe'],
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
  if (result.status === 0) {
    stage = 'synthetic backup restoration'
    const dump = docker('exec', database, 'pg_dump', '-U', 'postgres', 'postgres')
    docker('exec', database, 'createdb', '-U', 'postgres', 'nutrition_restore')
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-d', 'nutrition_restore', '-v', 'ON_ERROR_STOP=1'], {
      input: dump, stdio: ['pipe', 'pipe', 'pipe'],
    })
    const fingerprint = `select md5(jsonb_build_object(
      'profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p),
      'plans',(select jsonb_agg(to_jsonb(p) order by id) from public.meal_plans p),
      'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname in ('public','canonical')),
      'function',pg_get_functiondef('public.activate_personal_meal_plan_v1(uuid,jsonb,timestamptz,uuid)'::regprocedure),
      'role_lookup',pg_get_functiondef('public.get_my_role()'::regprocedure),
      'profile_guard',pg_get_functiondef('public.guard_profile_sensitive_columns()'::regprocedure),
      'profile_timestamp',pg_get_functiondef('public.update_profiles_updated_at()'::regprocedure)
    )::text)`
    const digest = db => docker('exec', database, 'psql', '-U', 'postgres', '-d', db, '-Atc', fingerprint).trim()
    if (digest('postgres') !== digest('nutrition_restore')) throw new Error('Synthetic restore mismatch')
    console.log('Synthetic backup restored: profile/plan data, policies and activation function match.')
  }
} catch (error) {
  console.error(`Isolated nutrition persistence check failed at ${stage}; no production service was used.`)
  if (stage === 'fixture' || stage === 'profile trigger security') console.error(String(error.stderr ?? 'Fixture error'))
  process.exitCode = 1
} finally {
  for (const name of [rest, database]) if (created.includes(name)) docker('rm', '-f', '-v', name)
  if (created.includes(network)) docker('network', 'rm', network)
  console.log('Disposable synthetic test containers, volumes and network removed.')
}
