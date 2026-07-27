#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const STAGING_MIGRATION_MANIFEST_SCHEMA_VERSION = 1
export const AUTHORIZED_REFERENCE_DATA_MIGRATIONS = new Set([
  '20260317010000_seed_exercises_catalog.sql',
])
export const HISTORICAL_CRON_MIGRATIONS = new Set([
  '20260506_chat_ai_messages.sql',
  '20260529120000_schedule_weekly_diagnostic_cron.sql',
  '20260529140000_update_weekly_diagnostic_cron_to_daily.sql',
  '20260531110137_schedule_training_regen_cron.sql',
  '20260613_streak_reminder.sql',
])
export const ENVIRONMENT_SCOPED_CRON_MIGRATION =
  '20260725190000_configure_environment_scoped_cron.sql'

const DATA_STATEMENT_PATTERN =
  /^\s*(INSERT\s+INTO|UPDATE|DELETE\s+FROM|COPY|TRUNCATE|MERGE)\s+([a-zA-Z_][\w.]*)/i
const CALL_PATTERN =
  /^\s*(PERFORM|CALL|SELECT)\s+([a-zA-Z_][\w.]*)\s*\(/i
const MUTATING_CALL_PATTERN =
  /(?:schedule|unschedule|create_secret|update_secret|configure|claim|consume|increment|assign|delete|insert|update|set_)/

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function stripLineComment(line) {
  let inSingleQuote = false
  for (let index = 0; index < line.length - 1; index += 1) {
    if (line[index] === "'") {
      if (inSingleQuote && line[index + 1] === "'") {
        index += 1
        continue
      }
      inSingleQuote = !inSingleQuote
    }
    if (!inSingleQuote && line[index] === '-' && line[index + 1] === '-') {
      return line.slice(0, index)
    }
  }
  return line
}

function functionBodyRanges(lines) {
  const ranges = []
  let awaitingBody = false
  let activeTag = null
  let startLine = null

  lines.forEach((line, index) => {
    const withoutComment = stripLineComment(line)
    if (!awaitingBody && !activeTag && /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\b/i.test(withoutComment)) {
      awaitingBody = true
    }
    if (awaitingBody && !activeTag) {
      const match = withoutComment.match(/\bAS\s+(\$[a-zA-Z0-9_]*\$)/i)
      if (match) {
        activeTag = match[1]
        startLine = index + 1
        awaitingBody = false
        const remainder = withoutComment.slice((match.index ?? 0) + match[0].length)
        if (remainder.includes(activeTag)) {
          ranges.push([startLine, index + 1])
          activeTag = null
          startLine = null
        }
      }
      return
    }
    if (activeTag && withoutComment.includes(activeTag)) {
      ranges.push([startLine, index + 1])
      activeTag = null
      startLine = null
    }
  })

  return ranges
}

function lineInRanges(line, ranges) {
  return ranges.some(([start, end]) => line >= start && line <= end)
}

export function inventorySqlMutations(source) {
  const lines = source.split(/\r?\n/)
  const definitionRanges = functionBodyRanges(lines)
  const statements = []
  const calls = []

  lines.forEach((rawLine, index) => {
    const line = stripLineComment(rawLine)
    const lineNumber = index + 1
    const execution = lineInRanges(lineNumber, definitionRanges)
      ? 'definition_only'
      : 'migration'
    const dataMatch = line.match(DATA_STATEMENT_PATTERN)
    if (dataMatch) {
      statements.push({
        operation: dataMatch[1].toLowerCase().replace(/\s+/g, '_'),
        target: dataMatch[2],
        line: lineNumber,
        execution,
      })
    }
    const callMatch = line.match(CALL_PATTERN)
    if (callMatch && MUTATING_CALL_PATTERN.test(callMatch[2].toLowerCase())) {
      calls.push({
        operation: 'mutating_call',
        target: callMatch[2],
        line: lineNumber,
        execution,
      })
    }
  })

  return {
    statements,
    calls,
    migrationTimeCount: [...statements, ...calls]
      .filter(item => item.execution === 'migration').length,
    definitionOnlyCount: [...statements, ...calls]
      .filter(item => item.execution === 'definition_only').length,
  }
}

function categoryFor(file) {
  if (AUTHORIZED_REFERENCE_DATA_MIGRATIONS.has(file)) return 'reference_data'
  if (HISTORICAL_CRON_MIGRATIONS.has(file)) return 'cron_historical'
  if (file === ENVIRONMENT_SCOPED_CRON_MIGRATION) return 'cron_environment_scoped'
  return 'schema'
}

function knownDependenciesFor(file, source) {
  const dependencies = []
  if (file === '20260317010000_seed_exercises_catalog.sql') {
    dependencies.push('20260317000000_initial_schema_baseline.sql')
  }
  if (
    file !== '20260317010000_seed_exercises_catalog.sql'
    && /\bexercises_db\b/i.test(source)
  ) {
    dependencies.push('20260317010000_seed_exercises_catalog.sql')
  }
  if (file === ENVIRONMENT_SCOPED_CRON_MIGRATION) {
    dependencies.push(...HISTORICAL_CRON_MIGRATIONS)
  }
  return [...new Set(dependencies)]
}

function stagingVersionFor({ historicalVersion, collisionFiles, index }) {
  if (collisionFiles.length === 1) return historicalVersion
  if (historicalVersion.length !== 8) {
    throw new Error(`Cannot deterministically expand non-date collision ${historicalVersion}`)
  }
  return `${historicalVersion}${String(index + 1).padStart(6, '0')}`
}

export function createStagingMigrationManifest(migrationsRoot) {
  const files = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort()
  const byVersion = new Map()
  for (const file of files) {
    const historicalVersion = file.split('_', 1)[0]
    const group = byVersion.get(historicalVersion) ?? []
    group.push(file)
    byVersion.set(historicalVersion, group)
  }

  const migrations = files.map((file, orderIndex) => {
    const path = join(migrationsRoot, file)
    const source = readFileSync(path, 'utf8')
    const historicalVersion = file.split('_', 1)[0]
    const collisionFiles = byVersion.get(historicalVersion)
    const collisionIndex = collisionFiles.indexOf(file)
    const stagingVersion = stagingVersionFor({
      historicalVersion,
      collisionFiles,
      index: collisionIndex,
    })
    const suffix = file.slice(historicalVersion.length)
    const mutationInventory = inventorySqlMutations(source)
    const category = categoryFor(file)
    const unauthorizedMigrationTimeMutation =
      mutationInventory.migrationTimeCount > 0
      && category !== 'reference_data'
      && category !== 'cron_historical'

    return {
      sourcePath: `supabase/migrations/${file}`,
      historicalVersion,
      historicalName: file,
      sourceSha256: sha256(source),
      stagingVersion,
      stagingName: `${stagingVersion}${suffix}`,
      absoluteOrder: orderIndex + 1,
      collisionGroup: collisionFiles.length > 1 ? historicalVersion : null,
      category,
      knownDependencies: knownDependenciesFor(file, source),
      authorization: category === 'reference_data'
        ? 'reference_data_authorized'
        : unauthorizedMigrationTimeMutation
          ? 'blocked_data_mutation'
          : category === 'cron_historical'
            ? 'authorized_noop_pg_cron_absent'
            : 'authorized_schema',
      allowed: !unauthorizedMigrationTimeMutation,
      mutationInventory,
      justification: category === 'reference_data'
        ? 'Canonical synthetic exercise catalog explicitly authorized for empty staging.'
        : unauthorizedMigrationTimeMutation
          ? 'Migration-time data mutation requires separate operator authorization.'
          : category === 'cron_historical'
            ? 'Historical source is immutable and its cron block is a no-op only while pg_cron is absent.'
            : 'Schema or definition-only migration; no migration-time data mutation detected.',
    }
  })

  const stagingVersions = migrations.map(migration => migration.stagingVersion)
  if (new Set(stagingVersions).size !== stagingVersions.length) {
    throw new Error('Generated staging versions are not unique')
  }
  const stagingNames = migrations.map(migration => migration.stagingName)
  if (stagingNames.some((name, index) => index > 0 && name <= stagingNames[index - 1])) {
    throw new Error('Generated staging names do not preserve strict historical order')
  }

  return {
    schemaVersion: STAGING_MIGRATION_MANIFEST_SCHEMA_VERSION,
    authority: 'moovx-staging-migration-reversioning',
    sourceRoot: 'supabase/migrations',
    sourceMigrationCount: migrations.length,
    sourceOrder: 'lexical-filename',
    stagingOrder: 'lexical-filename',
    reversionRule: {
      uniqueHistoricalVersion: 'preserve',
      collidingDateOnlyVersion: 'YYYYMMDD + one-based lexical rank padded to HHMMSS',
      randomOrCurrentTime: false,
    },
    authorizedReferenceData: [...AUTHORIZED_REFERENCE_DATA_MIGRATIONS],
    migrations,
  }
}

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function main() {
  const argv = process.argv.slice(2)
  const output = resolve(valueFor(argv, '--write'))
  const migrationsRoot = resolve(
    argv.includes('--migrations')
      ? valueFor(argv, '--migrations')
      : 'supabase/migrations',
  )
  const manifest = createStagingMigrationManifest(migrationsRoot)
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    output,
    migrationCount: manifest.sourceMigrationCount,
  })}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `staging migration manifest refused: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  }
}
