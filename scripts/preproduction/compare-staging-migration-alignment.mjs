#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PRODUCTION_HOSTS,
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from './environment-guard.mjs'
import {
  buildCandidatePlan,
  buildMutationClassification,
} from './staging-mutation-classification.mjs'

export const STAGING_ALIGNMENT_VERDICTS = Object.freeze({
  aligned: 'ALIGNED',
  missing: 'MISSING_REMOTE_VERSIONS',
  extra: 'EXTRA_REMOTE_VERSIONS',
  duplicate: 'DUPLICATE_REMOTE_VERSIONS',
  order: 'ORDER_MISMATCH',
  invalid: 'INVALID_REMOTE_INVENTORY',
  structure: 'STRUCTURE_DRIFT',
  incomplete: 'INCOMPLETE_EVIDENCE',
})

const STRUCTURE_FAMILIES = Object.freeze([
  'tables',
  'functions',
  'policies',
  'publications',
])
const SECRET_FIELD_PATTERN =
  /(authorization|cookie|password|secret|service.?role|token|private.?key|anon.?key)/i
const VERSION_PATTERN = /^\d{8}(?:\d{6})?$/

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function containsForbiddenProductionReference(value) {
  const normalized = String(value).trim().toLowerCase()
  return normalized.includes(PRODUCTION_SUPABASE_PROJECT_REF)
    || [...PRODUCTION_HOSTS].some(host =>
      normalized === host
      || normalized.startsWith(`${host}/`)
      || normalized.includes(`://${host}`),
    )
}

function assertSafeMetadata(value, path = 'inventory') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertSafeMetadata(child, `${path}[${index}]`))
    return
  }
  if (typeof value === 'string') {
    if (containsForbiddenProductionReference(value)) {
      throw new Error(`Production reference forbidden in migration inventory: ${path}`)
    }
    try {
      const parsed = new URL(value)
      if (parsed.username || parsed.password) {
        throw new Error(`URL credentials forbidden in migration inventory: ${path}`)
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('URL credentials forbidden')) {
        throw error
      }
    }
    return
  }
  if (!isRecord(value)) return
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_PATTERN.test(key)) {
      throw new Error(`Secret-like field forbidden in migration inventory: ${path}.${key}`)
    }
    assertSafeMetadata(child, `${path}.${key}`)
  }
}

function assertStagingTarget(inventory) {
  if (!isRecord(inventory)) return
  assertSafeMetadata(inventory)
  if (inventory.projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('Production Supabase project ref is forbidden')
  }
  if (inventory.projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`Migration inventory projectRef must be ${STAGING_SUPABASE_PROJECT_REF}`)
  }
  if (inventory.host !== undefined) {
    if (typeof inventory.host !== 'string') {
      throw new Error('Migration inventory host must be a string when present')
    }
    const normalizedHost = inventory.host.trim().toLowerCase()
    if (normalizedHost !== `${STAGING_SUPABASE_PROJECT_REF}.supabase.co`) {
      throw new Error('Migration inventory host must identify the staging Supabase project')
    }
  }
}

function normalizeStructure(structure) {
  if (!isRecord(structure)) return null
  const normalized = {}
  for (const family of STRUCTURE_FAMILIES) {
    if (!Array.isArray(structure[family])) return null
    if (structure[family].some(item => typeof item !== 'string' || item.trim() === '')) {
      return null
    }
    normalized[family] = [...structure[family]].sort()
  }
  return normalized
}

function structuresMatch(expected, remote) {
  return STRUCTURE_FAMILIES.every(
    family => JSON.stringify(expected[family]) === JSON.stringify(remote[family]),
  )
}

function duplicateValues(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([version]) => version)
    .sort()
}

function orderDifferences(expectedVersions, remoteVersions) {
  const expectedSet = new Set(expectedVersions)
  const remoteSet = new Set(remoteVersions)
  const expectedCommon = expectedVersions.filter(version => remoteSet.has(version))
  const remoteCommon = remoteVersions.filter(version => expectedSet.has(version))
  return expectedCommon.flatMap((expectedVersion, index) =>
    remoteCommon[index] === expectedVersion
      ? []
      : [{
          position: index + 1,
          expectedVersion,
          remoteVersion: remoteCommon[index] ?? null,
        }],
  )
}

function invalidReport(expectedPlan, inventory, capturedAt = null) {
  return {
    expectedSourceCount: expectedPlan.expectedSourceCount,
    expectedStagingCount: expectedPlan.expectedStagingCount,
    remoteCount: Array.isArray(inventory?.versions) ? inventory.versions.length : 0,
    missingVersions: [],
    extraVersions: [],
    duplicateRemoteVersions: [],
    orderMismatches: [],
    excludedSources: expectedPlan.excludedSources,
    overlayVersions: expectedPlan.overlayVersions,
    aligned: false,
    verdict: STAGING_ALIGNMENT_VERDICTS.invalid,
    capturedAt,
  }
}

function assertExpectedPlan(expectedPlan) {
  if (!isRecord(expectedPlan)) throw new Error('Expected staging plan is required')
  if (expectedPlan.expectedSourceCount !== 149) {
    throw new Error('Expected staging source count must be 149')
  }
  if (
    expectedPlan.expectedStagingCount !== 145
    || !Array.isArray(expectedPlan.expectedVersions)
    || expectedPlan.expectedVersions.length !== 145
  ) {
    throw new Error('Alignment must compare the final 145-version staging plan')
  }
  if (new Set(expectedPlan.expectedVersions).size !== 145) {
    throw new Error('Expected staging versions must be unique')
  }
  if (expectedPlan.expectedVersions.some(version => !VERSION_PATTERN.test(version))) {
    throw new Error('Expected staging versions are malformed')
  }
  if (
    !Array.isArray(expectedPlan.excludedSources)
    || expectedPlan.excludedSources.length !== 5
    || !Array.isArray(expectedPlan.overlayVersions)
    || expectedPlan.overlayVersions.length !== 1
  ) {
    throw new Error('Expected staging exclusions or overlay are incomplete')
  }
}

export function buildExpectedStagingAlignmentPlan({
  migrationManifest,
  repositoryRoot = process.cwd(),
  structureInventory,
}) {
  const classification = buildMutationClassification({
    migrationManifest,
    repositoryRoot,
  })
  const finalPlan = buildCandidatePlan({
    migrationManifest,
    classification,
    plan: 'final',
  })
  const includedHistorical = new Set(finalPlan.includedHistoricalMigrations)
  const orderedMigrations = [
    ...migrationManifest.migrations
      .filter(migration => includedHistorical.has(migration.historicalName)),
    ...finalPlan.overlays,
  ].sort((left, right) => left.stagingName.localeCompare(right.stagingName))
  const expectedPlan = {
    expectedSourceCount: migrationManifest.sourceMigrationCount,
    expectedStagingCount: finalPlan.includedMigrationCount,
    expectedVersions: orderedMigrations.map(migration => migration.stagingVersion),
    excludedSources: [...finalPlan.excludedMigrations],
    overlayVersions: finalPlan.overlays.map(overlay => overlay.stagingVersion),
    structureInventory:
      structureInventory === undefined
        ? undefined
        : normalizeStructure(structureInventory),
  }
  assertExpectedPlan(expectedPlan)
  if (structureInventory !== undefined && expectedPlan.structureInventory === null) {
    throw new Error('Expected structure inventory is malformed')
  }
  return expectedPlan
}

export function compareStagingMigrationAlignment({
  expectedPlan,
  remoteInventory,
  requireStructure = false,
}) {
  assertExpectedPlan(expectedPlan)
  assertStagingTarget(remoteInventory)

  const capturedAt = typeof remoteInventory?.capturedAt === 'string'
    && !Number.isNaN(Date.parse(remoteInventory.capturedAt))
    ? remoteInventory.capturedAt
    : null
  if (
    !isRecord(remoteInventory)
    || !Array.isArray(remoteInventory.versions)
    || remoteInventory.versions.some(
      version => typeof version !== 'string' || !VERSION_PATTERN.test(version),
    )
    || (
      remoteInventory.capturedAt !== undefined
      && (
        typeof remoteInventory.capturedAt !== 'string'
        || Number.isNaN(Date.parse(remoteInventory.capturedAt))
      )
    )
    || (
      remoteInventory.structure !== undefined
      && normalizeStructure(remoteInventory.structure) === null
    )
  ) {
    return invalidReport(expectedPlan, remoteInventory, capturedAt)
  }

  const remoteVersions = [...remoteInventory.versions]
  const expectedVersions = expectedPlan.expectedVersions
  const expectedSet = new Set(expectedVersions)
  const remoteSet = new Set(remoteVersions)
  const missingVersions = expectedVersions.filter(version => !remoteSet.has(version))
  const extraVersions = [...remoteSet].filter(version => !expectedSet.has(version))
  const duplicateRemoteVersions = duplicateValues(remoteVersions)
  const orderMismatches = orderDifferences(expectedVersions, remoteVersions)
  const expectedStructure = normalizeStructure(expectedPlan.structureInventory)
  const remoteStructure = normalizeStructure(remoteInventory.structure)
  const structureEvidenceIncomplete = requireStructure
    && (expectedStructure === null || remoteStructure === null)
  const structureDrift = !structureEvidenceIncomplete
    && expectedStructure !== null
    && remoteStructure !== null
    && !structuresMatch(expectedStructure, remoteStructure)

  let verdict = STAGING_ALIGNMENT_VERDICTS.aligned
  if (duplicateRemoteVersions.length > 0) verdict = STAGING_ALIGNMENT_VERDICTS.duplicate
  else if (missingVersions.length > 0) verdict = STAGING_ALIGNMENT_VERDICTS.missing
  else if (extraVersions.length > 0) verdict = STAGING_ALIGNMENT_VERDICTS.extra
  else if (orderMismatches.length > 0) verdict = STAGING_ALIGNMENT_VERDICTS.order
  else if (structureDrift) verdict = STAGING_ALIGNMENT_VERDICTS.structure
  else if (structureEvidenceIncomplete) verdict = STAGING_ALIGNMENT_VERDICTS.incomplete

  return {
    expectedSourceCount: expectedPlan.expectedSourceCount,
    expectedStagingCount: expectedPlan.expectedStagingCount,
    remoteCount: remoteVersions.length,
    missingVersions,
    extraVersions,
    duplicateRemoteVersions,
    orderMismatches,
    excludedSources: expectedPlan.excludedSources,
    overlayVersions: expectedPlan.overlayVersions,
    aligned: verdict === STAGING_ALIGNMENT_VERDICTS.aligned,
    verdict,
    capturedAt,
  }
}

function valueFor(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return argv[index + 1]
}

function assertLocalInventoryArgument(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return resolve(value)
  }
  if (parsed.protocol) throw new Error('Inventory must be an explicit local file')
  return resolve(value)
}

function readJsonFile(path, label) {
  const source = readFileSync(path, 'utf8')
  try {
    return JSON.parse(source)
  } catch {
    throw new Error(`${label} must contain valid JSON`)
  }
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--linked')) {
    throw new Error('--linked is forbidden for local migration alignment')
  }
  const inventoryIndexes = argv.flatMap((argument, index) =>
    argument === '--inventory' ? [index] : [],
  )
  if (inventoryIndexes.length !== 1) {
    throw new Error('Exactly one --inventory argument is required')
  }
  const inventoryValueIndex = inventoryIndexes[0] + 1
  argv.forEach((argument, index) => {
    const isInventoryValue = index === inventoryValueIndex
    if (
      !isInventoryValue
      && argument !== '--inventory'
      && argument !== '--require-structure'
    ) {
      throw new Error(`Unsupported argument: ${argument}`)
    }
  })
  const inventoryPath = assertLocalInventoryArgument(valueFor(argv, '--inventory'))
  const manifest = readJsonFile(
    resolve(process.cwd(), 'scripts/preproduction/staging-migration-manifest.json'),
    'Staging migration manifest',
  )
  const remoteInventory = readJsonFile(inventoryPath, 'Remote migration inventory')
  const expectedPlan = buildExpectedStagingAlignmentPlan({
    migrationManifest: manifest,
  })
  const report = compareStagingMigrationAlignment({
    expectedPlan,
    remoteInventory,
    requireStructure: argv.includes('--require-structure'),
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (!report.aligned) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `staging migration alignment refused: ${
        error instanceof Error ? error.message : 'unknown error'
      }\n`,
    )
    process.exitCode = 1
  }
}
