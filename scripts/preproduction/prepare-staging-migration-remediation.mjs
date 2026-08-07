#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  STAGING_ALIGNMENT_VERDICTS,
  buildExpectedStagingAlignmentPlan,
  compareStagingMigrationAlignment,
} from './compare-staging-migration-alignment.mjs'
import {
  PRODUCTION_HOSTS,
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from './environment-guard.mjs'

export const EXPECTED_STAGING_MISSING_VERSIONS = Object.freeze([
  '20260718150000',
  '20260729100000',
  '20260805100000',
  '20260806100000',
])

export const EXPECTED_STAGING_INITIAL_STATE = Object.freeze({
  seedanceJobs: 'absent',
  handleNewUserFunction: 'present',
  authUserCreatedTrigger: 'absent',
  messagesTable: 'present',
  messagesRealtimePublication: 'absent',
  paymentsStripeEventConstraint: 'absent',
  paymentsStripeEventPartialIndex: 'present',
})

export const STAGING_REMEDIATION_DECISIONS = Object.freeze({
  ready: 'READY',
  blocked: 'BLOCKED',
})

const SECRET_FIELD_PATTERN =
  /(authorization|cookie|password|secret|service.?role|token|private.?key|anon.?key|credential)/i
const REQUIRED_INVENTORY_KEYS = Object.freeze([
  'capturedAt',
  'projectRef',
  'source',
  'structure',
  'versions',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function containsProductionReference(value) {
  const normalized = String(value).trim().toLowerCase()
  return normalized.includes(PRODUCTION_SUPABASE_PROJECT_REF)
    || [...PRODUCTION_HOSTS].some(host =>
      normalized === host
      || normalized.startsWith(`${host}/`)
      || normalized.includes(`://${host}`),
    )
}

function assertSafeValue(value, path = 'inventory') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertSafeValue(child, `${path}[${index}]`))
    return
  }
  if (typeof value === 'string') {
    if (containsProductionReference(value)) {
      throw new Error(`Production reference forbidden: ${path}`)
    }
    if (/https?:\/\//i.test(value)) {
      throw new Error(`URL forbidden in remediation inventory: ${path}`)
    }
    return
  }
  if (!isRecord(value)) return
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_PATTERN.test(key)) {
      throw new Error(`Secret-like field forbidden: ${path}.${key}`)
    }
    assertSafeValue(child, `${path}.${key}`)
  }
}

function assertInventory(inventory) {
  if (!isRecord(inventory)) throw new Error('Remediation inventory is required')
  if (!arraysEqual(Object.keys(inventory).sort(), [...REQUIRED_INVENTORY_KEYS].sort())) {
    throw new Error('Remediation inventory fields are invalid')
  }
  assertSafeValue(inventory)
  if (inventory.projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`Inventory projectRef must be ${STAGING_SUPABASE_PROJECT_REF}`)
  }
  if (inventory.source !== 'operator-read-only') {
    throw new Error('Inventory source must be operator-read-only')
  }
  if (typeof inventory.capturedAt !== 'string' || Number.isNaN(Date.parse(inventory.capturedAt))) {
    throw new Error('Inventory capturedAt must be a valid timestamp')
  }
  if (!Array.isArray(inventory.versions)
    || inventory.versions.some(version => typeof version !== 'string' || !/^\d{8}(?:\d{6})?$/.test(version))) {
    throw new Error('Inventory versions are invalid')
  }
  if (!isRecord(inventory.structure)
    || !arraysEqual(
      Object.keys(inventory.structure).sort(),
      Object.keys(EXPECTED_STAGING_INITIAL_STATE).sort(),
    )) {
    throw new Error('Inventory structure fields are invalid')
  }
}

function remediationStepFor(migration) {
  const contracts = {
    '20260718150000': {
      domain: 'Seedance',
      precondition: 'seedance_jobs_absent',
      postcondition: 'seedance_jobs_rls_closed',
    },
    '20260729100000': {
      domain: 'Auth',
      precondition: 'handle_new_user_present_trigger_absent',
      postcondition: 'auth_trigger_present_once',
    },
    '20260805100000': {
      domain: 'Realtime',
      precondition: 'messages_present_publication_entry_absent',
      postcondition: 'messages_published_once',
    },
    '20260806100000': {
      domain: 'Billing',
      precondition: 'no_event_duplicates_partial_index_present',
      postcondition: 'full_unique_constraint_present',
    },
  }
  return {
    sequence: EXPECTED_STAGING_MISSING_VERSIONS.indexOf(migration.stagingVersion) + 1,
    version: migration.stagingVersion,
    sourceFile: basename(migration.sourcePath),
    sourceSha256: migration.sourceSha256,
    domain: contracts[migration.stagingVersion].domain,
    precondition: contracts[migration.stagingVersion].precondition,
    postcondition: contracts[migration.stagingVersion].postcondition,
    transactionBoundary: 'one_migration',
    onFailure: 'STOP',
  }
}

export function prepareStagingMigrationRemediation({
  migrationManifest,
  inventory,
  repositoryRoot = process.cwd(),
}) {
  assertInventory(inventory)
  const expectedPlan = buildExpectedStagingAlignmentPlan({
    migrationManifest,
    repositoryRoot,
  })
  const comparison = compareStagingMigrationAlignment({
    expectedPlan,
    remoteInventory: {
      projectRef: inventory.projectRef,
      capturedAt: inventory.capturedAt,
      source: inventory.source,
      versions: inventory.versions,
    },
  })
  const reasons = []
  if (comparison.verdict !== STAGING_ALIGNMENT_VERDICTS.missing) {
    reasons.push(`ALIGNMENT_VERDICT_${comparison.verdict}`)
  }
  if (!arraysEqual(comparison.missingVersions, EXPECTED_STAGING_MISSING_VERSIONS)) {
    reasons.push('MISSING_VERSION_SET_UNEXPECTED')
  }
  if (comparison.extraVersions.length > 0) reasons.push('EXTRA_VERSION_PRESENT')
  if (comparison.duplicateRemoteVersions.length > 0) reasons.push('DUPLICATE_VERSION_PRESENT')
  if (comparison.orderMismatches.length > 0) reasons.push('VERSION_ORDER_DIVERGENT')
  if (!arraysEqual(inventory.structure, EXPECTED_STAGING_INITIAL_STATE)) {
    reasons.push('STRUCTURE_STATE_UNEXPECTED')
  }

  const finalVersions = new Set(expectedPlan.expectedVersions)
  const migrations = EXPECTED_STAGING_MISSING_VERSIONS.map(version => {
    const migration = migrationManifest.migrations.find(item => item.stagingVersion === version)
    if (!migration || !finalVersions.has(version) || migration.allowed !== true) {
      reasons.push(`MIGRATION_NOT_IN_FINAL_PLAN_${version}`)
      return null
    }
    const source = readFileSync(resolve(repositoryRoot, migration.sourcePath), 'utf8')
    if (sha256(source) !== migration.sourceSha256) {
      reasons.push(`SOURCE_HASH_DIVERGENT_${version}`)
    }
    return migration
  }).filter(Boolean)

  const decision = reasons.length === 0
    ? STAGING_REMEDIATION_DECISIONS.ready
    : STAGING_REMEDIATION_DECISIONS.blocked
  return {
    decision,
    projectRef: inventory.projectRef,
    capturedAt: inventory.capturedAt,
    expectedStagingVersionCount: 145,
    observedStagingVersionCount: inventory.versions.length,
    missingVersions: comparison.missingVersions,
    extraVersionCount: comparison.extraVersions.length,
    duplicateVersionCount: comparison.duplicateRemoteVersions.length,
    orderMismatchCount: comparison.orderMismatches.length,
    initialStructureVerified: arraysEqual(
      inventory.structure,
      EXPECTED_STAGING_INITIAL_STATE,
    ),
    steps: migrations.map(remediationStepFor),
    reasons: [...new Set(reasons)].sort(),
    remoteAccess: false,
    mutationExecuted: false,
  }
}

export function assertSafeRemediationArgs(argv) {
  if (argv.includes('--prod')) throw new Error('--prod is forbidden')
  if (argv.includes('--linked')) throw new Error('--linked is forbidden')
  const indexes = argv.flatMap((argument, index) => argument === '--inventory' ? [index] : [])
  if (indexes.length !== 1) throw new Error('Exactly one --inventory argument is required')
  const valueIndex = indexes[0] + 1
  const value = argv[valueIndex]
  if (!value || value.startsWith('--')) throw new Error('Missing local inventory path')
  argv.forEach((argument, index) => {
    if (argument !== '--inventory' && index !== valueIndex) {
      throw new Error(`Unsupported argument: ${argument}`)
    }
  })
  try {
    const parsed = new URL(value)
    if (parsed.protocol) throw new Error('Inventory must be an explicit local file')
  } catch (error) {
    if (error instanceof Error && error.message.includes('explicit local file')) throw error
  }
  return resolve(value)
}

function main() {
  const inventoryPath = assertSafeRemediationArgs(process.argv.slice(2))
  const repositoryRoot = process.cwd()
  const manifest = JSON.parse(readFileSync(
    resolve(repositoryRoot, 'scripts/preproduction/staging-migration-manifest.json'),
    'utf8',
  ))
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))
  const report = prepareStagingMigrationRemediation({
    migrationManifest: manifest,
    inventory,
    repositoryRoot,
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.decision !== STAGING_REMEDIATION_DECISIONS.ready) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `Staging migration remediation preparation refused: ${
        error instanceof Error ? error.message : 'unknown error'
      }\n`,
    )
    process.exitCode = 1
  }
}
