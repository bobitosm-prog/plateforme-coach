#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  STAGING_SUPABASE_PROJECT_REF,
  assertMigrationSourcesSafe,
  assertPreLinkEnvironment,
  readStagingManifest,
} from './environment-guard.mjs'

const HISTORICAL_CRON_MIGRATIONS = new Set([
  '20260529120000_schedule_weekly_diagnostic_cron.sql',
  '20260529140000_update_weekly_diagnostic_cron_to_daily.sql',
  '20260531110137_schedule_training_regen_cron.sql',
  '20260613_streak_reminder.sql',
])
const ENVIRONMENT_SCOPED_CRON_MIGRATION =
  '20260725190000_configure_environment_scoped_cron.sql'
const VERSIONED_REFERENCE_DATA_MIGRATIONS = new Set([
  '20260317010000_seed_exercises_catalog.sql',
])

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function assertDryRunOnly(argv) {
  if (argv.includes('--apply')) {
    throw new Error('Migration apply is not implemented or authorized; use --dry-run')
  }
  if (!argv.includes('--dry-run')) {
    throw new Error('Only --dry-run is supported')
  }
}

function readLinkedProjectRef(repositoryRoot) {
  const path = join(repositoryRoot, 'supabase/.temp/project-ref')
  let projectRef
  try {
    projectRef = readFileSync(path, 'utf8').trim()
  } catch {
    throw new Error('Supabase project is not linked; missing supabase/.temp/project-ref')
  }
  if (projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`Linked Supabase project ref is forbidden or unexpected: ${projectRef || '<empty>'}`)
  }
  return projectRef
}

function collectMigrations(migrationsRoot) {
  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => {
      const path = join(migrationsRoot, entry.name)
      const source = readFileSync(path)
      const logicalVersion = entry.name.split('_', 1)[0]
      return {
        file: entry.name,
        logicalVersion,
        sha256: createHash('sha256').update(source).digest('hex'),
      }
    })
    .sort((left, right) => {
      if (left.file < right.file) return -1
      if (left.file > right.file) return 1
      return 0
    })
}

function assertCronReplayPlan(migrations) {
  const names = migrations.map(migration => migration.file)
  for (const historical of HISTORICAL_CRON_MIGRATIONS) {
    if (!names.includes(historical)) {
      throw new Error(`Missing historical cron migration: ${historical}`)
    }
  }
  if (!names.includes(ENVIRONMENT_SCOPED_CRON_MIGRATION)) {
    throw new Error(`Missing environment-scoped cron migration: ${ENVIRONMENT_SCOPED_CRON_MIGRATION}`)
  }
  const correctiveIndex = names.indexOf(ENVIRONMENT_SCOPED_CRON_MIGRATION)
  if ([...HISTORICAL_CRON_MIGRATIONS].some(name => names.indexOf(name) > correctiveIndex)) {
    throw new Error('Environment-scoped cron migration must follow every historical cron migration')
  }
}

function characterizeMigrationVersions(migrations) {
  const byVersion = new Map()
  for (const migration of migrations) {
    const group = byVersion.get(migration.logicalVersion) ?? []
    group.push(migration.file)
    byVersion.set(migration.logicalVersion, group)
  }
  const collisions = [...byVersion.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([logicalVersion, files]) => ({ logicalVersion, files }))

  return {
    logicalVersionCount: byVersion.size,
    nonStandardVersionFiles: migrations
      .filter(migration => migration.logicalVersion.length !== 14)
      .map(migration => migration.file),
    collisions,
    collisionFileCount: collisions.reduce((count, collision) => count + collision.files.length, 0),
  }
}

export function createMigrationDryRunPlan({
  manifest,
  environment,
  repositoryRoot,
  linkedProjectRef,
}) {
  const target = assertPreLinkEnvironment({ manifest, environment })
  if (linkedProjectRef !== target.projectRef) {
    throw new Error('Linked project ref does not match the staging manifest')
  }

  const migrationsRoot = resolve(repositoryRoot, 'supabase/migrations')
  const migrationSafety = assertMigrationSourcesSafe(migrationsRoot)
  const migrations = collectMigrations(migrationsRoot)
  assertCronReplayPlan(migrations)
  const versioning = characterizeMigrationVersions(migrations)
  const versionedReferenceDataMigrations = migrations
    .filter(migration => VERSIONED_REFERENCE_DATA_MIGRATIONS.has(migration.file))
    .map(migration => migration.file)
  const blockingIssues = [
    ...(versioning.collisions.length > 0
      ? [{
          kind: 'logical_version_collisions',
          groupCount: versioning.collisions.length,
          fileCount: versioning.collisionFileCount,
        }]
      : []),
    ...(versionedReferenceDataMigrations.length > 0
      ? [{
          kind: 'versioned_reference_data_requires_authorization',
          files: versionedReferenceDataMigrations,
        }]
      : []),
  ]

  return {
    status: 'ok',
    mode: 'dry-run',
    acceptableForApply: blockingIssues.length === 0,
    target: {
      projectRef: target.projectRef,
      projectName: target.projectName,
      organizationId: target.organizationId,
      region: target.region,
      size: target.size,
    },
    order: 'lexical-filename',
    transactionBoundary: 'one-transaction-per-file',
    onErrorStop: true,
    separateSeedIncluded: false,
    seedsIncluded: false,
    versionedReferenceDataMigrations,
    rolesIncluded: false,
    migrationCount: migrations.length,
    migrations,
    versioning,
    blockingIssues,
    cron: {
      historicalMigrations: [...HISTORICAL_CRON_MIGRATIONS],
      historicalReplayPrecondition: 'pg_cron-absent',
      environmentScopedMigration: ENVIRONMENT_SCOPED_CRON_MIGRATION,
      jobsCreatedByDryRun: 0,
      jobsCreatedByEnvironmentScopedMigration: 0,
    },
    ...migrationSafety,
  }
}

function main() {
  const argv = process.argv.slice(2)
  assertDryRunOnly(argv)

  const manifestPath = valueFor(argv, '--manifest')
  if (!isAbsolute(manifestPath)) {
    throw new Error('Staging manifest path must be absolute')
  }
  const repositoryRoot = process.cwd()
  const manifest = readStagingManifest(manifestPath, repositoryRoot)
  const linkedProjectRef = readLinkedProjectRef(repositoryRoot)
  const plan = createMigrationDryRunPlan({
    manifest,
    environment: process.env,
    repositoryRoot,
    linkedProjectRef,
  })
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `preproduction migration runner refused: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  }
}
