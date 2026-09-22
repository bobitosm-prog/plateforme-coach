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
  const photoMigration = readFileSync(new URL('../supabase/migrations/20260919133822_private_progress_photos.sql', import.meta.url))
  for (const input of [readFileSync(new URL('../tests/integration/photo-storage-fixture.sql', import.meta.url)),
    photoMigration, photoMigration, readFileSync(new URL('../tests/integration/photo-storage-security.sql', import.meta.url))]) {
    execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  console.log('Photo Storage: private bucket, owner/active-coach reads, former-coach/anonymous denial and scoped deletion passed.')
  const avatarMigration=readFileSync(new URL('../supabase/migrations/20260919140110_avatar_owner_write_boundaries.sql',import.meta.url))
  for (const input of [avatarMigration,avatarMigration,readFileSync(new URL('../tests/integration/avatar-storage-security.sql',import.meta.url))]) {
    execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  console.log('Avatar Storage: three owner paths/upsert, foreign writes/reassignment/anonymous denial, restrictive boundaries passed.')
  const ingestionMigration=readFileSync(new URL('../supabase/migrations/20260919150432_server_only_photo_ingestion.sql',import.meta.url))
  for (const input of [ingestionMigration,ingestionMigration,readFileSync(new URL('../tests/integration/photo-ingestion-lockdown.sql',import.meta.url))]) {
    execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  console.log('Photo ingestion: direct upload/upsert/update/move denied; trusted writes, owner reads/deletion and other buckets preserved.')
  const guardFixture = readFileSync(new URL('../supabase/migrations/20260617120000_guard_profile_sensitive_columns.sql', import.meta.url))
  const trialMigration = readFileSync(new URL('../supabase/migrations/20260919153623_restore_onboarding_trial.sql', import.meta.url))
  for (const input of [guardFixture, trialMigration, trialMigration,
    readFileSync(new URL('../tests/integration/initial-trial.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
  console.log('Initial trial: fixed 14 days, idempotency, expired/paid/coach guards and scoped privileges passed.')
  const triggerMigration = readFileSync(new URL('../supabase/migrations/20260919130017_harden_profile_trigger_search_paths.sql', import.meta.url))
  for (const input of [guardFixture, triggerMigration, triggerMigration,
    readFileSync(new URL('../tests/integration/profile-trigger-security.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
  console.log('Profile triggers: seven protected fields, safe nutrition edits and shadow-resistant timestamps passed.')
  stage = 'atomic AI quota migration'
  const quotaMigration = readFileSync(new URL('../supabase/migrations/20260919131647_atomic_heavy_ai_reservations.sql', import.meta.url))
  for (const input of [quotaMigration, quotaMigration,
    readFileSync(new URL('../tests/integration/ai-quota-expiry.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
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
  stage = 'weekly atomic adjustments'
  const weeklyMigration = readFileSync(new URL('../supabase/migrations/20260920091849_weekly_atomic_adjustments.sql', import.meta.url))
  for (const input of [readFileSync(new URL('../tests/integration/weekly-adjustment-fixture.sql', import.meta.url)),
    weeklyMigration, weeklyMigration, readFileSync(new URL('../tests/integration/weekly-adjustment-atomic.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, stdio: ['pipe', 'pipe', 'pipe'] })
  }
  console.log('Weekly adjustments: server-only decisions/RPCs, owner reads, retries, stale state and complete rollback passed.')
  stage = 'weekly supervision and historical programs'
  for (const name of ['20260920100749_weekly_generation_supervision','20260920100750_weekly_historical_phase_adjustments','20260920101926_weekly_supervised_schedule']) {
    const input=readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url))
    for (let pass=0;pass<2;pass++) execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:readFileSync(new URL('../tests/integration/weekly-supervision-security.sql',import.meta.url)),stdio:['pipe','pipe','pipe']})
  // Exercise the same transaction on the alternate historical storage contract.
  stage = 'calendar exact duplicate repair'
  const scheduleMigration = readFileSync(new URL('../supabase/migrations/20260920112251_scheduled_session_exact_dedup.sql', import.meta.url))
  for (const input of [readFileSync(new URL('../tests/integration/schedule-dedup-fixture.sql', import.meta.url)),
    scheduleMigration, scheduleMigration, readFileSync(new URL('../tests/integration/schedule-dedup-security.sql', import.meta.url))]) {
    execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, stdio: ['pipe', 'pipe', 'pipe'] })
  }
  console.log('Calendar repair: completed history preserved, three duplicates archived privately, idempotent migration passed.')
  stage='training follow-up'
  execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:readFileSync(new URL('../tests/integration/training-followup-fixture.sql',import.meta.url)),stdio:['pipe','pipe','pipe']})
  for(const name of ['20260921145109_training_followup_preferences','20260921145357_training_set_techniques','20260921145813_training_followup_proposals','20260921173100_weekly_followup_consent','20260921173200_overload_expiry','20260922183207_training_restpause_stages']) {
    const input=readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url))
    for(let pass=0;pass<2;pass++)execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  stage='program editor atomic persistence'
  const editorMigration=readFileSync(new URL('../supabase/migrations/20260921160900_training_program_atomic_editor.sql',import.meta.url))
  for(const input of [readFileSync(new URL('../tests/integration/program-editor-fixture.sql',import.meta.url)),editorMigration,editorMigration]){
    execFileSync('docker',['exec','-i',database,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input,stdio:['pipe','pipe','pipe']})
  }
  const canonicalMigration = migration.toString().replaceAll('public.meal_plans', 'canonical.meal_plans')
    .replaceAll('public.activate_personal_meal_plan_v1', 'canonical.activate_personal_meal_plan_v1')
    .replaceAll('plan_data', 'plan').replaceAll('is_active', 'active')
  execFileSync('docker', ['exec', '-i', database, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: canonicalMigration, stdio: ['pipe', 'pipe', 'pipe'],
  })
  // Separate image retrieval from runtime failures; neither command contains credentials.
  stage = 'postgrest image pull'
  docker('pull', 'public.ecr.aws/supabase/postgrest:v14.14')
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
      'weekly_jobs',(select jsonb_agg(to_jsonb(j) order by user_id,week_start) from public.weekly_generation_jobs j),
      'weekly_runs',(select jsonb_agg(to_jsonb(r) order by id) from public.weekly_generation_runs r),
      'weekly_claim',pg_get_functiondef('public.claim_weekly_generation_v1(uuid)'::regprocedure),
      'weekly_settle',pg_get_functiondef('public.settle_weekly_generation_v1(uuid,uuid,date,text,uuid)'::regprocedure),
      'weekly_apply',pg_get_functiondef('public.apply_weekly_adjustment_v1(uuid,uuid,jsonb)'::regprocedure),
      'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in ('public','canonical','storage')),
      'buckets',(select jsonb_agg(to_jsonb(b) order by id) from storage.buckets b),
      'function',pg_get_functiondef('public.activate_personal_meal_plan_v1(uuid,jsonb,timestamptz,uuid)'::regprocedure),
      'role_lookup',pg_get_functiondef('public.get_my_role()'::regprocedure),
      'profile_guard',pg_get_functiondef('public.guard_profile_sensitive_columns()'::regprocedure),
      'profile_timestamp',pg_get_functiondef('public.update_profiles_updated_at()'::regprocedure),
      'reservations',(select jsonb_agg(to_jsonb(r) order by id) from ai_quota_private.reservations r),
      'usage',(select jsonb_agg(to_jsonb(l) order by id) from public.ai_usage_logs l),
      'reserve_function',pg_get_functiondef('public.reserve_heavy_ai_v1(uuid,text,uuid)'::regprocedure),
      'settle_function',pg_get_functiondef('public.settle_heavy_ai_v1(uuid,uuid,boolean)'::regprocedure)
    )::text)`
    const digest = db => docker('exec', database, 'psql', '-U', 'postgres', '-d', db, '-Atc', fingerprint).trim()
    if (digest('postgres') !== digest('nutrition_restore')) throw new Error('Synthetic restore mismatch')
    console.log('Synthetic backup restored: profile/plan data, policies and activation function match.')
  }
} catch (error) {
  console.error(`Isolated nutrition persistence check failed at ${stage}; no production service was used.`)
  // Never print the full child-process error: it can contain environment values.
  // This disposable runner has no production credentials; redact its generated JWT secret too.
  if (error.stderr) console.error(String(error.stderr).replaceAll(secret, '[REDACTED]'))
  process.exitCode = 1
} finally {
  for (const name of [rest, database]) if (created.includes(name)) docker('rm', '-f', '-v', name)
  if (created.includes(network)) docker('network', 'rm', network)
  console.log('Disposable synthetic test containers, volumes and network removed.')
}
