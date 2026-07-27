#!/usr/bin/env node

import { resolve } from 'node:path'
import {
  assertMigrationSourcesSafe,
  assertPreCreateEnvironment,
  assertPreLinkEnvironment,
  readStagingManifest,
} from './environment-guard.mjs'

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function main() {
  const argv = process.argv.slice(2)
  const mode = valueFor(argv, '--mode')
  if (!['pre-create', 'pre-link'].includes(mode)) {
    throw new Error(`Unsupported guard mode: ${mode}`)
  }

  const manifestPath = valueFor(argv, '--manifest')
  const manifest = readStagingManifest(manifestPath)
  const result = mode === 'pre-create'
    ? assertPreCreateEnvironment({ manifest })
    : assertPreLinkEnvironment({ manifest })
  const migrationsRoot = argv.includes('--migrations')
    ? valueFor(argv, '--migrations')
    : resolve(process.cwd(), 'supabase/migrations')
  const migrationSafety = assertMigrationSourcesSafe(migrationsRoot)

  process.stdout.write(`${JSON.stringify({
    status: 'ok',
    mode,
    ...result,
    ...migrationSafety,
  })}\n`)
}

try {
  main()
} catch (error) {
  process.stderr.write(`preproduction guard refused: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
