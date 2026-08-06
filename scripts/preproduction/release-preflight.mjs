#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_RELEASE_EVIDENCE = Object.freeze([
  'unitTests',
  'typecheck',
  'lint',
  'build',
  'criticalE2E',
  'emptyDatabaseRebuild',
  'migrationAlignment',
  'supabaseTypes',
  'supabaseFactories',
  'i18n',
  'performanceBudget',
])

export const RELEASE_EVIDENCE_SOURCES = Object.freeze({
  unitTests: 'npm-test',
  typecheck: 'tsc-noemit',
  lint: 'eslint',
  build: 'next-build',
  criticalE2E: 'critical-e2e',
  emptyDatabaseRebuild: 'empty-database-rebuild',
  migrationAlignment: 'staging-migration-alignment',
  supabaseTypes: 'supabase-types-check',
  supabaseFactories: 'supabase-factories-check',
  i18n: 'i18n-check',
  performanceBudget: 'performance-budget-check',
})

export const RELEASE_DECISIONS = Object.freeze({
  go: 'GO',
  noGo: 'NO_GO',
  blocked: 'BLOCKED',
})

export const RELEASE_STATUSES = Object.freeze({
  readyForPreview: 'READY_FOR_PREVIEW',
  previewValidated: 'PREVIEW_VALIDATED',
  go: 'GO',
  noGo: 'NO_GO',
  blocked: 'BLOCKED',
})

const ALLOWED_BRANCH = 'phase-6-staging'
const ALLOWED_EVIDENCE_STATUSES = new Set(['PASS', 'FAIL', 'MISSING', 'SKIPPED'])
const ALLOWED_ENVIRONMENTS = new Set(['local', 'preview', 'staging', 'production'])
const ALLOWED_VERCEL_ENVIRONMENTS = new Set(['development', 'preview', 'production'])
const ALLOWED_STRIPE_MODES = new Set(['disabled', 'test', 'live'])
const REQUIRED_INPUT_KEYS = Object.freeze([
  'branch',
  'headSha',
  'expectedSha',
  'worktreeClean',
  'divergenceLeft',
  'divergenceRight',
  'migrationAlignmentVerdict',
  'requiredEvidence',
  'environment',
  'vercelEnvironment',
  'stripeMode',
  'productionAuthorized',
  'results',
])
const SECRET_FIELD_PATTERN =
  /(authorization|cookie|password|secret|service.?role|token|private.?key|anon.?key|api.?key|signed.?url)/i
const SECRET_VALUE_PATTERNS = Object.freeze([
  /\bBearer\s+[^\s]+/i,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]+/i,
  /\bwhsec_[A-Za-z0-9_-]+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
])
const PRODUCTION_REFERENCE_PATTERN =
  /(?:^|https?:\/\/)(?:app\.)?moovx\.ch(?:[/:]|$)|njlzossopgknanhkzcbk/i
const SHA_PATTERN = /^[a-f0-9]{7,40}$/

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason)
}

function inspectSensitiveMaterial(value, path, findings) {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      inspectSensitiveMaterial(child, `${path}[${index}]`, findings))
    return
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_FIELD_PATTERN.test(key)) findings.secret = true
      inspectSensitiveMaterial(child, `${path}.${key}`, findings)
    }
    return
  }
  if (typeof value !== 'string') return
  if (SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value))) findings.secret = true
  if (PRODUCTION_REFERENCE_PATTERN.test(value)) findings.productionReference = true
  try {
    const url = new URL(value)
    if (url.username || url.password) findings.secret = true
  } catch {
    // Non-URL evidence identifiers are expected.
  }
}

function validIsoTimestamp(value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return false
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
}

function validateEvidence(name, evidence, malformedReasons, noGoReasons) {
  if (!isRecord(evidence)) {
    addReason(malformedReasons, `MALFORMED_EVIDENCE:${name}`)
    return null
  }
  const keys = Object.keys(evidence).sort()
  const expectedKeys = ['capturedAt', 'durationMs', 'source', 'status']
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    addReason(malformedReasons, `MALFORMED_EVIDENCE:${name}`)
    return null
  }
  if (!ALLOWED_EVIDENCE_STATUSES.has(evidence.status)) {
    addReason(malformedReasons, `INVALID_EVIDENCE_STATUS:${name}`)
  }
  if (!Number.isFinite(evidence.durationMs) || evidence.durationMs < 0) {
    addReason(malformedReasons, `INVALID_EVIDENCE_DURATION:${name}`)
  }
  if (
    typeof evidence.source !== 'string'
    || evidence.source !== RELEASE_EVIDENCE_SOURCES[name]
  ) {
    addReason(malformedReasons, `INVALID_EVIDENCE_SOURCE:${name}`)
  }
  if (!validIsoTimestamp(evidence.capturedAt)) {
    addReason(malformedReasons, `INVALID_EVIDENCE_CAPTURED_AT:${name}`)
  }
  if (evidence.status !== 'PASS') {
    addReason(noGoReasons, `EVIDENCE_${evidence.status}:${name}`)
  }
  return ALLOWED_EVIDENCE_STATUSES.has(evidence.status) ? evidence.status : null
}

function evidenceSummary(requiredEvidence, results) {
  const summary = { required: requiredEvidence.length, passed: 0, failed: 0, missing: 0, skipped: 0 }
  for (const name of requiredEvidence) {
    const status = results?.[name]?.status
    if (status === 'PASS') summary.passed += 1
    else if (status === 'FAIL') summary.failed += 1
    else if (status === 'SKIPPED') summary.skipped += 1
    else summary.missing += 1
  }
  return summary
}

function blockedReport(candidateSha, reasons, summary) {
  return {
    status: RELEASE_STATUSES.blocked,
    decision: RELEASE_DECISIONS.blocked,
    candidateSha,
    blockingReasons: reasons,
    warnings: ['HUMAN_APPROVAL_REQUIRED', 'CI_STABILITY_NOT_ATTESTED'],
    gates: { localEvidence: false, migrationAlignment: false, productionExcluded: false },
    evidenceSummary: summary,
  }
}

/**
 * Purely evaluates a caller-supplied, local release proof. It performs no I/O.
 */
export function evaluateReleasePreflight(input) {
  const malformedReasons = []
  const securityReasons = []
  const noGoReasons = []
  const findings = { secret: false, productionReference: false }
  inspectSensitiveMaterial(input, 'input', findings)
  if (findings.secret) addReason(securityReasons, 'SECRET_MATERIAL_DETECTED')
  if (findings.productionReference) addReason(securityReasons, 'PRODUCTION_REFERENCE_FORBIDDEN')

  if (!isRecord(input)) {
    return blockedReport(null, ['MALFORMED_REPORT'], {
      required: REQUIRED_RELEASE_EVIDENCE.length,
      passed: 0,
      failed: 0,
      missing: REQUIRED_RELEASE_EVIDENCE.length,
      skipped: 0,
    })
  }

  const inputKeys = Object.keys(input).sort()
  if (JSON.stringify(inputKeys) !== JSON.stringify([...REQUIRED_INPUT_KEYS].sort())) {
    addReason(malformedReasons, 'MALFORMED_REPORT')
  }
  const candidateSha = SHA_PATTERN.test(input.expectedSha) ? input.expectedSha : null
  if (!SHA_PATTERN.test(input.headSha) || !SHA_PATTERN.test(input.expectedSha)) {
    addReason(malformedReasons, 'INVALID_CANDIDATE_SHA')
  }
  if (typeof input.worktreeClean !== 'boolean') addReason(malformedReasons, 'INVALID_WORKTREE_STATE')
  if (!Number.isInteger(input.divergenceLeft) || input.divergenceLeft < 0
    || !Number.isInteger(input.divergenceRight) || input.divergenceRight < 0) {
    addReason(malformedReasons, 'INVALID_GIT_DIVERGENCE')
  }
  if (!ALLOWED_ENVIRONMENTS.has(input.environment)) addReason(malformedReasons, 'INVALID_ENVIRONMENT')
  if (!ALLOWED_VERCEL_ENVIRONMENTS.has(input.vercelEnvironment)) {
    addReason(malformedReasons, 'INVALID_VERCEL_ENVIRONMENT')
  }
  if (!ALLOWED_STRIPE_MODES.has(input.stripeMode)) addReason(malformedReasons, 'INVALID_STRIPE_MODE')
  if (typeof input.productionAuthorized !== 'boolean') {
    addReason(malformedReasons, 'INVALID_PRODUCTION_AUTHORIZATION')
  }
  if (!Array.isArray(input.requiredEvidence)
    || JSON.stringify(input.requiredEvidence) !== JSON.stringify(REQUIRED_RELEASE_EVIDENCE)) {
    addReason(malformedReasons, 'INVALID_REQUIRED_EVIDENCE_CONTRACT')
  }
  if (!isRecord(input.results)) addReason(malformedReasons, 'MALFORMED_RESULTS')

  const results = isRecord(input.results) ? input.results : {}
  const unexpectedResultKeys = Object.keys(results)
    .filter(name => !REQUIRED_RELEASE_EVIDENCE.includes(name))
  if (unexpectedResultKeys.length > 0) {
    addReason(malformedReasons, 'MALFORMED_RESULTS')
  }
  for (const name of REQUIRED_RELEASE_EVIDENCE) {
    if (!(name in results)) addReason(noGoReasons, `EVIDENCE_MISSING:${name}`)
    else validateEvidence(name, results[name], malformedReasons, noGoReasons)
  }

  const summary = evidenceSummary(REQUIRED_RELEASE_EVIDENCE, results)
  if (input.environment === 'production' && input.productionAuthorized !== true) {
    addReason(securityReasons, 'PRODUCTION_AUTHORIZATION_REQUIRED')
  }
  if (input.environment === 'production' && input.productionAuthorized === true) {
    addReason(securityReasons, 'PRODUCTION_EXECUTION_UNSUPPORTED')
  }
  if (input.vercelEnvironment === 'production') {
    addReason(securityReasons, 'VERCEL_PRODUCTION_FORBIDDEN')
  }
  if (input.stripeMode === 'live') addReason(securityReasons, 'STRIPE_LIVE_FORBIDDEN')

  if (malformedReasons.length || securityReasons.length) {
    return blockedReport(
      candidateSha,
      [...malformedReasons, ...securityReasons],
      summary,
    )
  }

  if (input.branch !== ALLOWED_BRANCH) addReason(noGoReasons, 'BRANCH_NOT_ALLOWED')
  if (!input.worktreeClean) addReason(noGoReasons, 'WORKTREE_NOT_CLEAN')
  if (input.divergenceLeft !== 0 || input.divergenceRight !== 0) {
    addReason(noGoReasons, 'GIT_DIVERGENCE')
  }
  if (input.headSha !== input.expectedSha) addReason(noGoReasons, 'CANDIDATE_SHA_MISMATCH')
  if (input.migrationAlignmentVerdict !== 'ALIGNED') {
    addReason(noGoReasons, `MIGRATION_ALIGNMENT_${String(input.migrationAlignmentVerdict || 'MISSING')}`)
  }

  const gates = {
    localEvidence: noGoReasons.every(reason => !reason.startsWith('EVIDENCE_')),
    migrationAlignment: input.migrationAlignmentVerdict === 'ALIGNED',
    productionExcluded: input.environment !== 'production'
      && input.vercelEnvironment !== 'production'
      && input.stripeMode !== 'live',
  }
  const warnings = ['HUMAN_APPROVAL_REQUIRED', 'CI_STABILITY_NOT_ATTESTED']
  if (noGoReasons.length) {
    return {
      status: RELEASE_STATUSES.noGo,
      decision: RELEASE_DECISIONS.noGo,
      candidateSha,
      blockingReasons: noGoReasons,
      warnings,
      gates,
      evidenceSummary: summary,
    }
  }

  const status = input.environment === 'local'
    ? RELEASE_STATUSES.readyForPreview
    : RELEASE_STATUSES.previewValidated
  return {
    status,
    decision: RELEASE_DECISIONS.go,
    candidateSha,
    blockingReasons: [],
    warnings,
    gates,
    evidenceSummary: summary,
  }
}

export function assertSafeReleasePreflightArgs(argv) {
  if (argv.includes('--prod')) throw new Error('--prod is forbidden')
  if (argv.includes('--linked')) throw new Error('--linked is forbidden')
  const inputIndexes = argv.flatMap((argument, index) => argument === '--input' ? [index] : [])
  if (inputIndexes.length !== 1) throw new Error('Exactly one --input argument is required')
  const inputIndex = inputIndexes[0] + 1
  if (!argv[inputIndex] || argv[inputIndex].startsWith('--')) {
    throw new Error('Missing local preflight input path')
  }
  argv.forEach((argument, index) => {
    if (index !== inputIndex && argument !== '--input') {
      throw new Error(`Unsupported argument: ${argument}`)
    }
  })
  try {
    const parsed = new URL(argv[inputIndex])
    if (parsed.protocol) throw new Error('Preflight input must be an explicit local file')
  } catch (error) {
    if (error instanceof Error && error.message.includes('explicit local file')) throw error
  }
  return resolve(argv[inputIndex])
}

function main() {
  const inputPath = assertSafeReleasePreflightArgs(process.argv.slice(2))
  let input
  try {
    input = JSON.parse(readFileSync(inputPath, 'utf8'))
  } catch {
    input = null
  }
  const report = evaluateReleasePreflight(input)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.decision !== RELEASE_DECISIONS.go) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `release preflight refused: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    )
    process.exitCode = 1
  }
}
