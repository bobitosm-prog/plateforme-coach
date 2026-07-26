#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhase6SeedSql } from './generate-phase6-seed.mjs'
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
  assertPreLinkEnvironment,
  readStagingManifest,
} from './environment-guard.mjs'

const EXPECTED_HISTORY_COUNT = 138
const EXPECTED_TABLE_COUNTS = {
  'auth.users': 9,
  'public.profiles': 9,
  'public.coach_clients': 1,
  'public.meal_plans': 6,
  'public.client_meal_plans': 2,
  'public.saved_meals': 4,
  'public.daily_food_logs': 14,
  'public.meal_tracking': 7,
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function enabledSeedConfig(source) {
  const marker = '[db.seed]'
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) throw new Error('Missing [db.seed] in config')
  const before = source.slice(0, markerIndex)
  const section = source.slice(markerIndex)
  const updated = section.replace(/\benabled\s*=\s*false\b/, 'enabled = true')
  if (updated === section) throw new Error('Expected disabled seed in source config')
  return `${before}${updated}`
}

export function verifyPhase6SeedAuthority({
  manifestSource,
  fixtureSource,
  lockSource,
}) {
  const manifest = JSON.parse(manifestSource)
  const lock = JSON.parse(lockSource)
  const generated = buildPhase6SeedSql(manifest)
  const manifestSha256 = sha256(manifestSource)
  const fixtureSha256 = sha256(fixtureSource)
  const generatedSha256 = sha256(generated)

  if (
    lock.schemaVersion !== 1
    || lock.authority !== 'moovx-phase6-staging-seed-lock-v1'
    || lock.projectRef !== STAGING_SUPABASE_PROJECT_REF
    || lock.namespace !== '76000000'
  ) {
    throw new Error('Invalid Phase 6 seed lock authority')
  }
  if (manifest.projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error('Seed manifest targets an unexpected project')
  }
  if (manifest.projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('Production project forbidden in seed manifest')
  }
  if (manifestSha256 !== lock.manifestSha256) {
    throw new Error('Seed manifest SHA-256 mismatch')
  }
  if (fixtureSha256 !== lock.fixtureSha256 || generatedSha256 !== lock.fixtureSha256) {
    throw new Error('Seed fixture SHA-256 mismatch')
  }
  if (JSON.stringify(manifest.tableCounts) !== JSON.stringify(EXPECTED_TABLE_COUNTS)) {
    throw new Error('Seed table volumes differ from the approved contract')
  }
  if (JSON.stringify(lock.tableCounts) !== JSON.stringify(EXPECTED_TABLE_COUNTS)) {
    throw new Error('Seed lock table volumes differ from the approved contract')
  }
  const combined = `${manifestSource}\n${fixtureSource}`
  if (
    /njlzossopgknanhkzcbk|app\.moovx\.ch|https?:\/\/moovx\.ch/i.test(combined)
    || /\b(?:sk_live|pk_live|rk_live|whsec|cus_|sub_|acct_)[A-Za-z0-9_]+/.test(combined)
    || /(?:password|secret|token)\s*["':=]/i.test(combined)
  ) {
    throw new Error('Forbidden production reference, credential or Stripe id in seed')
  }
  return {
    status: 'ok',
    authority: manifest.authority,
    projectRef: manifest.projectRef,
    namespace: manifest.namespace,
    manifestSha256,
    fixtureSha256,
    historyCountRequired: EXPECTED_HISTORY_COUNT,
    tableCounts: manifest.tableCounts,
    owners: {
      admin: 1,
      coach: 1,
      clients: 7,
      foreign: 0,
    },
    nutritionStatuses: [
      'canonical',
      'legacy_converted',
      'not_found',
      'conflict',
      'invalid',
      'legacy_unsupported',
      'failure_runner_only',
    ],
    containsPassword: false,
    containsStripeId: false,
    containsProductionUrl: false,
    secondPass: 'idempotent_namespace_upsert',
  }
}

export function withTemporaryPhase6SeedWorkdir({
  repositoryRoot,
  fixtureSource,
  execute,
}) {
  const root = mkdtempSync(join(tmpdir(), 'moovx-phase6-seed-'))
  try {
    const supabaseRoot = join(root, 'supabase')
    cpSync(resolve(repositoryRoot, 'supabase'), supabaseRoot, {
      recursive: true,
      filter(source) {
        const relative = source.slice(resolve(repositoryRoot, 'supabase').length)
        return !relative.startsWith('/.temp')
          && !relative.startsWith('/migrations')
          && basename(source) !== 'seed.sql'
      },
    })
    cpSync(
      resolve(repositoryRoot, 'supabase/.temp'),
      join(supabaseRoot, '.temp'),
      {
        recursive: true,
        filter(source) {
          return !/(password|secret|token|key)/i.test(basename(source))
        },
      },
    )
    writeFileSync(
      join(supabaseRoot, 'config.toml'),
      enabledSeedConfig(
        readFileSync(resolve(repositoryRoot, 'supabase/config.toml'), 'utf8'),
      ),
    )
    writeFileSync(join(supabaseRoot, 'seed.sql'), fixtureSource, { mode: 0o600 })
    return execute(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
    if (existsSync(root)) throw new Error(`Seed workdir was not removed: ${root}`)
  }
}

function executeSupabaseSeedPush(root, { dryRun }) {
  const args = [
    'supabase',
    'db',
    'push',
    '--workdir',
    root,
    '--linked',
    '--include-seed',
  ]
  if (dryRun) args.push('--dry-run')
  else args.push('--yes')
  const result = spawnSync('npx', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: '1',
    },
  })
  if (result.status !== 0) {
    throw new Error(
      `Supabase seed ${dryRun ? 'dry-run' : 'apply'} failed: ${
        result.stderr || result.stdout
      }`,
    )
  }
  return {
    exitCode: result.status,
    output: result.stdout,
    errorOutput: result.stderr,
  }
}

export function executePhase6SeedPlan(
  root,
  execute = executeSupabaseSeedPush,
  { apply },
) {
  const dryRun = execute(root, { dryRun: true })
  if (!apply) return { dryRun, apply: null, executionCount: 0 }
  const applied = execute(root, { dryRun: false })
  return { dryRun, apply: applied, executionCount: 1 }
}

function main() {
  const argv = process.argv.slice(2)
  const dryRunOnly = argv.includes('--dry-run')
  const apply = argv.includes('--apply')
  if (dryRunOnly === apply) {
    throw new Error('Choose exactly one execution mode: --dry-run or --apply')
  }
  const repositoryRoot = process.cwd()
  const environmentManifest = readStagingManifest(
    resolve(valueFor(argv, '--environment-manifest')),
    repositoryRoot,
  )
  const target = assertPreLinkEnvironment({ manifest: environmentManifest })
  const linkedProjectRef = readFileSync(
    resolve(repositoryRoot, 'supabase/.temp/project-ref'),
    'utf8',
  ).trim()
  if (
    target.projectRef !== STAGING_SUPABASE_PROJECT_REF
    || linkedProjectRef !== STAGING_SUPABASE_PROJECT_REF
  ) {
    throw new Error('Linked project differs from the authorized staging target')
  }

  const manifestSource = readFileSync(
    resolve(valueFor(argv, '--manifest')),
    'utf8',
  )
  const fixtureSource = readFileSync(
    resolve(valueFor(argv, '--fixture')),
    'utf8',
  )
  const lockSource = readFileSync(
    resolve(valueFor(argv, '--lock')),
    'utf8',
  )
  const verification = verifyPhase6SeedAuthority({
    manifestSource,
    fixtureSource,
    lockSource,
  })
  const execution = withTemporaryPhase6SeedWorkdir({
    repositoryRoot,
    fixtureSource,
    execute: root => executePhase6SeedPlan(root, undefined, { apply }),
  })
  process.stdout.write(`${JSON.stringify({
    ...verification,
    mode: apply ? 'apply' : 'dry-run',
    workdirCreated: true,
    workdirRemoved: true,
    execution,
  }, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `Phase 6 seed runner refused: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
