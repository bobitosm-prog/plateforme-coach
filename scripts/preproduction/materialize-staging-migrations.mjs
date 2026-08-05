#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  STAGING_MIGRATION_MANIFEST_SCHEMA_VERSION,
  createStagingMigrationManifest,
} from './staging-migration-manifest.mjs'
import {
  FINAL_STAGING_OVERLAYS,
  buildCandidatePlan,
  buildMutationClassification,
} from './staging-mutation-classification.mjs'
import {
  STAGING_SUPABASE_PROJECT_REF,
  assertPreLinkEnvironment,
  readStagingManifest,
} from './environment-guard.mjs'

const FINAL_OPERATOR_PLAN_SHA256 =
  '5ceefc49e83940254aeeee342ff30755f0adb40c1f3e072bd014f0b009a9d637'

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

export function verifyStagingMigrationManifest({
  manifest,
  migrationsRoot,
}) {
  if (manifest.schemaVersion !== STAGING_MIGRATION_MANIFEST_SCHEMA_VERSION) {
    throw new Error('Unsupported staging migration manifest schemaVersion')
  }
  const actual = createStagingMigrationManifest(migrationsRoot)
  if (manifest.sourceMigrationCount !== 148 || manifest.migrations.length !== 148) {
    throw new Error('Staging migration manifest must contain exactly 148 migrations')
  }
  if (JSON.stringify(manifest) !== JSON.stringify(actual)) {
    throw new Error('Staging migration manifest diverges from migration sources')
  }
  const stagingVersions = manifest.migrations.map(migration => migration.stagingVersion)
  if (new Set(stagingVersions).size !== 148) {
    throw new Error('Staging migration manifest contains a version collision')
  }
  const reversioned = manifest.migrations.filter(
    migration => migration.stagingVersion !== migration.historicalVersion,
  )
  if (reversioned.length !== 73) {
    throw new Error(`Expected 73 re-versioned migrations, received ${reversioned.length}`)
  }
  const collisionGroups = new Set(
    manifest.migrations.map(migration => migration.collisionGroup).filter(Boolean),
  )
  if (collisionGroups.size !== 17) {
    throw new Error(`Expected 17 resolved collision groups, received ${collisionGroups.size}`)
  }
  const blocked = manifest.migrations.filter(migration => !migration.allowed)

  return {
    status: 'ok',
    migrationCount: 148,
    shaCount: manifest.migrations.filter(migration => {
      const source = readFileSync(resolve(migrationsRoot, basename(migration.sourcePath)))
      return sha256(source) === migration.sourceSha256
    }).length,
    uniqueStagingVersionCount: new Set(stagingVersions).size,
    reversionedMigrationCount: reversioned.length,
    resolvedCollisionGroupCount: collisionGroups.size,
    blockedMigrations: blocked.map(migration => ({
      file: migration.historicalName,
      reason: migration.authorization,
      migrationTimeMutationCount: migration.mutationInventory.migrationTimeCount,
    })),
    acceptableForSupabaseDryRun: blocked.length === 0,
  }
}

function enabledConfig(source) {
  const marker = '[db.migrations]'
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) throw new Error('Missing [db.migrations] in config')
  const before = source.slice(0, markerIndex)
  const section = source.slice(markerIndex)
  const updated = section.replace(/\benabled\s*=\s*false\b/, 'enabled = true')
  if (updated === section) throw new Error('Expected disabled migrations in source config')
  return `${before}${updated}`
}

export function withTemporaryStagingWorkdir({
  repositoryRoot,
  manifest,
  runDryRun,
}) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'moovx-staging-migrations-'))
  try {
    const supabaseRoot = join(tempRoot, 'supabase')
    const outputMigrations = join(supabaseRoot, 'migrations')
    cpSync(resolve(repositoryRoot, 'supabase'), supabaseRoot, {
      recursive: true,
      filter(source) {
        const relative = source.slice(resolve(repositoryRoot, 'supabase').length)
        return !relative.startsWith('/.temp')
          && !relative.startsWith('/seed.sql')
          && !relative.startsWith('/migrations')
      },
    })
    cpSync(
      resolve(repositoryRoot, 'supabase/.temp'),
      join(supabaseRoot, '.temp'),
      {
        recursive: true,
        filter(source) {
          const name = basename(source)
          return !/(password|secret|token|key)/i.test(name)
        },
      },
    )
    writeFileSync(
      join(supabaseRoot, 'config.toml'),
      enabledConfig(readFileSync(resolve(repositoryRoot, 'supabase/config.toml'), 'utf8')),
    )
    mkdirSync(outputMigrations, { recursive: true })
    for (const migration of manifest.migrations) {
      const source = resolve(repositoryRoot, migration.sourcePath)
      const target = join(outputMigrations, migration.stagingName)
      if (sha256(readFileSync(source)) !== migration.sourceSha256) {
        throw new Error(`Materialized source SHA mismatch: ${migration.sourcePath}`)
      }
      cpSync(source, target)
    }
    const outputFiles = readdirSync(outputMigrations).filter(file => file.endsWith('.sql')).sort()
    if (outputFiles.length !== manifest.migrations.length) {
      throw new Error('Temporary workdir migration count mismatch')
    }
    const expected = manifest.migrations.map(migration => migration.stagingName)
    if (JSON.stringify(outputFiles) !== JSON.stringify(expected)) {
      throw new Error('Temporary workdir order differs from staging manifest')
    }
    return runDryRun(tempRoot)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
    if (existsSync(tempRoot)) {
      throw new Error(`Temporary workdir was not removed: ${tempRoot}`)
    }
  }
}

function executeSupabaseDbPush(tempRoot, { dryRun }) {
  const args = [
    'supabase',
    'db',
    'push',
    '--workdir',
    tempRoot,
    '--linked',
    '--include-all',
  ]
  if (dryRun) args.push('--dry-run')
  else args.push('--yes')
  const result = spawnSync(
    'npx',
    args,
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: '1',
      },
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `Supabase ${dryRun ? 'dry-run' : 'migration apply'} failed: ${
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

export function executeFinalSupabasePlan(
  tempRoot,
  execute = executeSupabaseDbPush,
) {
  const dryRun = execute(tempRoot, { dryRun: true })
  const apply = execute(tempRoot, { dryRun: false })
  return {
    onErrorStop: true,
    executionCount: 1,
    dryRun,
    apply,
  }
}

function main() {
  const argv = process.argv.slice(2)
  const dryRunOnly = argv.includes('--dry-run')
  const apply = argv.includes('--apply')
  if (dryRunOnly === apply) {
    throw new Error('Choose exactly one execution mode: --dry-run or --apply')
  }
  const manifestPath = resolve(valueFor(argv, '--manifest'))
  const environmentManifestPath = resolve(valueFor(argv, '--environment-manifest'))
  const repositoryRoot = process.cwd()
  const environmentManifest = readStagingManifest(environmentManifestPath, repositoryRoot)
  assertPreLinkEnvironment({ manifest: environmentManifest })
  const linkedProjectRef = readFileSync(
    resolve(repositoryRoot, 'supabase/.temp/project-ref'),
    'utf8',
  ).trim()
  if (linkedProjectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`Linked project ref must be ${STAGING_SUPABASE_PROJECT_REF}`)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const verification = verifyStagingMigrationManifest({
    manifest,
    migrationsRoot: resolve(repositoryRoot, 'supabase/migrations'),
  })
  let selectedManifest = manifest
  let selectedMutationPlan = null
  if (argv.includes('--mutation-plan')) {
    const mutationPlanName = valueFor(argv, '--mutation-plan')
    const classification = buildMutationClassification({
      migrationManifest: manifest,
      repositoryRoot,
    })
    const mutationPlan = buildCandidatePlan({
      migrationManifest: manifest,
      classification,
      plan: mutationPlanName,
    })
    if (!mutationPlan.acceptableForSupabaseDryRun) {
      process.stdout.write(`${JSON.stringify({
        ...verification,
        mutationClassificationTotals: classification.totals,
        mutationPlan,
        workdirCreated: false,
        supabaseDryRunExecuted: false,
      }, null, 2)}\n`)
      throw new Error(
        `${mutationPlanName} mutation plan is not safe for Supabase dry-run`,
      )
    }
    const included = new Set(mutationPlan.includedHistoricalMigrations)
    selectedManifest = {
      ...manifest,
      sourceMigrationCount: mutationPlan.includedMigrationCount,
      migrations: [
        ...manifest.migrations.filter(migration =>
          included.has(migration.historicalName),
        ),
        ...(mutationPlanName === 'final' ? FINAL_STAGING_OVERLAYS : []),
      ].sort((left, right) => left.stagingName.localeCompare(right.stagingName)),
    }
    selectedMutationPlan = mutationPlan
  }
  if (apply && selectedMutationPlan?.plan !== 'final') {
    throw new Error('Application requires --mutation-plan final')
  }
  if (selectedMutationPlan?.plan === 'final') {
    const operatorPlanSha256 = sha256(
      selectedMutationPlan.includedMigrations.join('\n'),
    )
    if (operatorPlanSha256 !== FINAL_OPERATOR_PLAN_SHA256) {
      throw new Error(
        `Final operator plan fingerprint mismatch: ${operatorPlanSha256}`,
      )
    }
    if (
      selectedMutationPlan.includedMigrationCount !== 144
      || selectedMutationPlan.uniqueStagingVersionCount !== 144
      || selectedMutationPlan.collisions !== 0
      || selectedMutationPlan.excludedMigrationCount !== 5
      || !selectedMutationPlan.historicalOrderPreserved
    ) {
      throw new Error('Final operator plan invariants are not satisfied')
    }
  }
  if (!selectedMutationPlan && !verification.acceptableForSupabaseDryRun) {
    process.stdout.write(`${JSON.stringify({
      ...verification,
      workdirCreated: false,
      supabaseDryRunExecuted: false,
    }, null, 2)}\n`)
    throw new Error(
      `${verification.blockedMigrations.length} migration(s) contain unauthorized migration-time data mutations`,
    )
  }
  const execution = withTemporaryStagingWorkdir({
    repositoryRoot,
    manifest: selectedManifest,
    runDryRun: tempRoot => apply
      ? executeFinalSupabasePlan(tempRoot)
      : {
          onErrorStop: true,
          executionCount: 0,
          dryRun: executeSupabaseDbPush(tempRoot, { dryRun: true }),
          apply: null,
        },
  })
  process.stdout.write(`${JSON.stringify({
    ...verification,
    mutationPlan: selectedMutationPlan,
    workdirCreated: true,
    workdirRemoved: true,
    supabaseDryRunExecuted: true,
    supabaseApplyExecuted: apply,
    operatorPlanSha256:
      selectedMutationPlan?.plan === 'final'
        ? FINAL_OPERATOR_PLAN_SHA256
        : null,
    execution,
  }, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `staging migration materializer refused: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  }
}
