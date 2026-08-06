#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROLLBACK_DECISIONS = Object.freeze({
  ready: 'READY',
  noGo: 'NO_GO',
  blocked: 'BLOCKED',
})

export const ROLLBACK_STATUSES = Object.freeze({
  draft: 'DRAFT',
  readyForRehearsal: 'READY_FOR_REHEARSAL',
  rehearsalRunning: 'REHEARSAL_RUNNING',
  rollbackSucceeded: 'ROLLBACK_SUCCEEDED',
  rollbackFailed: 'ROLLBACK_FAILED',
  noGo: 'NO_GO',
  blocked: 'BLOCKED',
  manualRecoveryRequired: 'MANUAL_RECOVERY_REQUIRED',
})

export const ROLLBACK_EVIDENCE_SOURCES = Object.freeze({
  candidateIdentity: 'release-candidate-record',
  healthyArtifactIdentity: 'immutable-artifact-record',
  environmentGuard: 'environment-guard',
  schemaCompatibility: 'schema-compatibility-check',
  migrationAlignment: 'migration-alignment-check',
  authorization: 'rollback-authorization-record',
  smokeTestPlan: 'rollback-smoke-test-plan',
  cleanupPlan: 'rollback-cleanup-plan',
  timingPlan: 'rollback-timing-plan',
  evidenceSanitization: 'evidence-sanitization-check',
})

export const REQUIRED_ROLLBACK_EVIDENCE = Object.freeze(
  Object.keys(ROLLBACK_EVIDENCE_SOURCES),
)

export const REQUIRED_SMOKE_TESTS = Object.freeze([
  'environment',
  'servedSha',
  'auth',
  'criticalJourneys',
  'dataConsistency',
  'privateMedia',
  'billing',
])

export const ROLLBACK_TIMING_CONTRACT = Object.freeze({
  startsAt: 'ROLLBACK_REQUIRED_APPROVED',
  endsAt: 'HEALTHY_ARTIFACT_READY_SHA_CONFIRMED_SMOKE_TESTS_PASS_JOURNAL_RECORDED',
  segments: Object.freeze([
    'decisionMs',
    'preflightMs',
    'actionMs',
    'platformWaitMs',
    'validationMs',
    'totalMs',
  ]),
  targetTotalMsExclusive: 1_800_000,
  platformWaitAndSmokeTestsIncluded: true,
})

const INPUT_KEYS = Object.freeze([
  'environment',
  'branch',
  'incidentSha',
  'healthySha',
  'incidentArtifactId',
  'healthyArtifactId',
  'artifactImmutabilityVerified',
  'servedShaBefore',
  'migrationAlignmentVerdict',
  'schemaCompatibility',
  'releaseCandidate',
  'approvals',
  'backupCapability',
  'requiredSmokeTests',
  'evidence',
  'stripeMode',
  'requestedCommands',
  'productionAuthorized',
  'startedAt',
])
const ALLOWED_ENVIRONMENTS = new Set(['local', 'preview', 'staging', 'production'])
const ALLOWED_EVIDENCE_STATUSES = new Set(['PASS', 'FAIL', 'MISSING', 'NOT_APPLICABLE'])
const ALLOWED_STRIPE_MODES = new Set(['disabled', 'test', 'live'])
const SHA_PATTERN = /^[a-f0-9]{7,40}$/
const SECRET_FIELD_PATTERN =
  /(?:authorization|cookie|password|secret|service.?role|token|private.?key|anon.?key|api.?key|signed.?url|credential)/i
const SECRET_VALUE_PATTERNS = Object.freeze([
  /\bBearer\s+[^\s]+/i,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]+/i,
  /\bwhsec_[A-Za-z0-9_-]+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /(?:password|secret|token|credential)\s*[=:]\s*\S+/i,
])
const PRODUCTION_REFERENCE_PATTERN =
  /(?:^|https?:\/\/)(?:app\.)?moovx\.ch(?:[/:]|$)|njlzossopgknanhkzcbk/i
const UNSAFE_COMMAND_PATTERNS = Object.freeze([
  /(?:^|\s)--prod(?:\s|$)/i,
  /(?:^|\s)--linked(?:\s|$)/i,
  /git\s+reset\s+--hard/i,
  /git\s+push\b[^\n]*(?:--force|-f(?:\s|$))/i,
  /supabase\s+db\s+push/i,
  /supabase\s+migration\s+repair/i,
  /supabase\s+db\s+reset\b[^\n]*(?:--linked|https?:\/\/|postgres(?:ql)?:\/\/)/i,
  /(?:rm|unlink|git\s+rm)\b[^\n]*supabase\/migrations/i,
  /(?:sed\s+-i|perl\s+-pi)\b[^\n]*supabase\/migrations/i,
  /\b(?:drop\s+(?:table|schema|database|function|policy|index)|truncate\s+table|delete\s+from|alter\s+table\b[^;]*\bdrop\b)/i,
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason)
}

function validIsoTimestamp(value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return false
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
}

function isUrl(value) {
  if (typeof value !== 'string') return false
  try {
    return Boolean(new URL(value).protocol)
  } catch {
    return false
  }
}

function inspectSensitiveMaterial(value, findings) {
  if (Array.isArray(value)) {
    value.forEach(child => inspectSensitiveMaterial(child, findings))
    return
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_FIELD_PATTERN.test(key) && !isRecord(child) && !Array.isArray(child)) {
        findings.secret = true
      }
      inspectSensitiveMaterial(child, findings)
    }
    return
  }
  if (typeof value !== 'string') return
  if (SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value))) findings.secret = true
  if (PRODUCTION_REFERENCE_PATTERN.test(value)) findings.productionReference = true
  try {
    const parsed = new URL(value)
    if (parsed.username || parsed.password) findings.secret = true
    if ([...parsed.searchParams.keys()].some(key => SECRET_FIELD_PATTERN.test(key))) {
      findings.secret = true
    }
  } catch {
    // Most proof identifiers and commands are deliberately not URLs.
  }
}

function validateEvidence(name, proof, malformedReasons, noGoReasons, optional) {
  if (!isRecord(proof)) {
    addReason(malformedReasons, 'REPORT_INVALID')
    return
  }
  if (JSON.stringify(Object.keys(proof).sort()) !== JSON.stringify(['capturedAt', 'source', 'status'])) {
    addReason(malformedReasons, 'REPORT_INVALID')
    return
  }
  if (!ALLOWED_EVIDENCE_STATUSES.has(proof.status)) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (proof.source !== ROLLBACK_EVIDENCE_SOURCES[name]) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!validIsoTimestamp(proof.capturedAt)) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (proof.status === 'FAIL' || proof.status === 'MISSING') {
    addReason(noGoReasons, 'REQUIRED_EVIDENCE_MISSING')
  }
  if (proof.status === 'NOT_APPLICABLE' && !optional) {
    addReason(noGoReasons, 'REQUIRED_EVIDENCE_MISSING')
  }
}

function evidenceSummary(evidence) {
  const summary = { required: REQUIRED_ROLLBACK_EVIDENCE.length, passed: 0, failed: 0, missing: 0, notApplicable: 0 }
  for (const name of REQUIRED_ROLLBACK_EVIDENCE) {
    const status = evidence?.[name]?.status
    if (status === 'PASS') summary.passed += 1
    else if (status === 'FAIL') summary.failed += 1
    else if (status === 'NOT_APPLICABLE') summary.notApplicable += 1
    else summary.missing += 1
  }
  return summary
}

function report(status, decision, blockingReasons, warnings, input) {
  return {
    status,
    decision,
    blockingReasons,
    warnings,
    rollbackTarget: {
      environment: ALLOWED_ENVIRONMENTS.has(input?.environment) ? input.environment : null,
      healthySha: SHA_PATTERN.test(input?.healthySha) ? input.healthySha : null,
      healthyArtifactIdPresent: typeof input?.healthyArtifactId === 'string'
        && input.healthyArtifactId.length > 0,
    },
    timingContract: ROLLBACK_TIMING_CONTRACT,
    requiredActions: decision === ROLLBACK_DECISIONS.ready
      ? ['AUTHORIZE_REHEARSAL', 'START_TIMER_AT_APPROVED_DECISION']
      : [...blockingReasons],
    evidenceSummary: evidenceSummary(input?.evidence),
  }
}

/**
 * Evaluates a caller-provided rollback rehearsal proof without I/O or mutation.
 */
export function evaluateRollbackPreflight(input) {
  const malformedReasons = []
  const securityReasons = []
  const noGoReasons = []
  const blockedReasons = []
  const warnings = ['ROLLBACK_NOT_EXECUTED', 'THIRTY_MINUTE_TARGET_NOT_ATTESTED']
  const findings = { secret: false, productionReference: false }
  inspectSensitiveMaterial(input, findings)

  if (!isRecord(input)) {
    return report(
      ROLLBACK_STATUSES.blocked,
      ROLLBACK_DECISIONS.blocked,
      ['REPORT_INVALID'],
      warnings,
      null,
    )
  }
  if (findings.secret) addReason(securityReasons, 'SECRET_DETECTED')

  if (JSON.stringify(Object.keys(input).sort()) !== JSON.stringify([...INPUT_KEYS].sort())) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!ALLOWED_ENVIRONMENTS.has(input.environment)) {
    addReason(malformedReasons, 'TARGET_ENVIRONMENT_NOT_ALLOWED')
  }
  if (!SHA_PATTERN.test(input.incidentSha) || !SHA_PATTERN.test(input.healthySha)) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!SHA_PATTERN.test(input.servedShaBefore)) addReason(malformedReasons, 'REPORT_INVALID')
  if (input.branch !== 'phase-6-staging') addReason(malformedReasons, 'REPORT_INVALID')
  if (isUrl(input.incidentArtifactId) || isUrl(input.healthyArtifactId)) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (typeof input.artifactImmutabilityVerified !== 'boolean') {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!validIsoTimestamp(input.startedAt)) addReason(malformedReasons, 'REPORT_INVALID')
  if (!ALLOWED_STRIPE_MODES.has(input.stripeMode)) addReason(malformedReasons, 'REPORT_INVALID')
  if (typeof input.productionAuthorized !== 'boolean') addReason(malformedReasons, 'REPORT_INVALID')
  if (!Array.isArray(input.requestedCommands)
    || input.requestedCommands.some(command => typeof command !== 'string')) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!Array.isArray(input.requiredSmokeTests)
    || input.requiredSmokeTests.some(test => typeof test !== 'string')) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!isRecord(input.releaseCandidate)
    || JSON.stringify(Object.keys(input.releaseCandidate).sort())
      !== JSON.stringify(['healthyArtifactSha', 'incidentArtifactSha'])) {
    addReason(malformedReasons, 'REPORT_INVALID')
  } else if (!SHA_PATTERN.test(input.releaseCandidate.incidentArtifactSha)
    || !SHA_PATTERN.test(input.releaseCandidate.healthyArtifactSha)) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!isRecord(input.approvals)
    || JSON.stringify(Object.keys(input.approvals).sort())
      !== JSON.stringify(['approver', 'operator', 'timer'])) {
    addReason(malformedReasons, 'REPORT_INVALID')
  } else if (Object.values(input.approvals).some(value => typeof value !== 'boolean')) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!isRecord(input.backupCapability)
    || JSON.stringify(Object.keys(input.backupCapability).sort())
      !== JSON.stringify(['attested', 'required'])) {
    addReason(malformedReasons, 'REPORT_INVALID')
  } else if (Object.values(input.backupCapability).some(value => typeof value !== 'boolean')) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }
  if (!isRecord(input.evidence)
    || Object.keys(input.evidence).some(name => !REQUIRED_ROLLBACK_EVIDENCE.includes(name))) {
    addReason(malformedReasons, 'REPORT_INVALID')
  }

  const localIsolated = input.environment === 'local'
  for (const name of REQUIRED_ROLLBACK_EVIDENCE) {
    if (!(name in (input.evidence ?? {}))) {
      addReason(noGoReasons, 'REQUIRED_EVIDENCE_MISSING')
      continue
    }
    validateEvidence(
      name,
      input.evidence[name],
      malformedReasons,
      noGoReasons,
      localIsolated && name === 'migrationAlignment',
    )
  }

  if (findings.productionReference && input.environment !== 'production') {
    addReason(securityReasons, 'TARGET_ENVIRONMENT_NOT_ALLOWED')
  }
  if (input.environment === 'production' && !input.productionAuthorized) {
    addReason(blockedReasons, 'PRODUCTION_AUTHORIZATION_REQUIRED')
  }
  if (input.stripeMode === 'live') addReason(securityReasons, 'LIVE_STRIPE_DETECTED')
  if ((input.requestedCommands ?? []).some(command =>
    UNSAFE_COMMAND_PATTERNS.some(pattern => pattern.test(command)))) {
    addReason(securityReasons, 'UNSAFE_COMMAND_DETECTED')
  }

  if (malformedReasons.length || securityReasons.length) {
    return report(
      ROLLBACK_STATUSES.blocked,
      ROLLBACK_DECISIONS.blocked,
      [...malformedReasons, ...securityReasons],
      warnings,
      input,
    )
  }

  if (typeof input.incidentArtifactId !== 'string' || input.incidentArtifactId === '') {
    addReason(noGoReasons, 'INCIDENT_ARTIFACT_MISSING')
  }
  if (typeof input.healthyArtifactId !== 'string' || input.healthyArtifactId === '') {
    addReason(noGoReasons, 'HEALTHY_ARTIFACT_MISSING')
  }
  if (input.artifactImmutabilityVerified !== true) {
    addReason(noGoReasons, 'HEALTHY_ARTIFACT_NOT_IMMUTABLE')
  }
  if (input.incidentSha === input.healthySha
    || input.servedShaBefore === input.healthySha) {
    addReason(noGoReasons, 'INCIDENT_AND_HEALTHY_ARTIFACT_EQUAL')
  }
  if (input.incidentArtifactId === input.healthyArtifactId) {
    addReason(noGoReasons, 'INCIDENT_AND_HEALTHY_ARTIFACT_EQUAL')
  }
  if (input.releaseCandidate.incidentArtifactSha !== input.incidentSha
    || input.releaseCandidate.healthyArtifactSha !== input.healthySha
    || input.servedShaBefore !== input.incidentSha) {
    addReason(noGoReasons, 'GIT_SHA_MISMATCH')
  }
  if (localIsolated) {
    if (input.schemaCompatibility !== 'LOCAL_REBUILT_COMPATIBLE') {
      addReason(noGoReasons, 'SCHEMA_COMPATIBILITY_UNPROVEN')
    }
    if (input.evidence.migrationAlignment?.status !== 'NOT_APPLICABLE') {
      addReason(noGoReasons, 'REPORT_INVALID')
    }
  } else {
    if (input.migrationAlignmentVerdict !== 'ALIGNED') {
      addReason(noGoReasons, 'MIGRATION_ALIGNMENT_NOT_ALIGNED')
    }
    if (input.schemaCompatibility !== 'COMPATIBLE') {
      addReason(noGoReasons, 'SCHEMA_COMPATIBILITY_UNPROVEN')
    }
  }
  if (!input.approvals.operator || !input.approvals.approver || !input.approvals.timer) {
    addReason(blockedReasons, 'APPROVAL_MISSING')
  }
  if (input.backupCapability.required && !input.backupCapability.attested) {
    addReason(blockedReasons, 'BACKUP_CAPABILITY_UNPROVEN')
  }
  if (JSON.stringify(input.requiredSmokeTests) !== JSON.stringify(REQUIRED_SMOKE_TESTS)) {
    addReason(noGoReasons, 'REQUIRED_SMOKE_TESTS_MISSING')
  }

  if (blockedReasons.length) {
    return report(
      ROLLBACK_STATUSES.blocked,
      ROLLBACK_DECISIONS.blocked,
      blockedReasons,
      warnings,
      input,
    )
  }
  if (noGoReasons.length) {
    return report(
      ROLLBACK_STATUSES.noGo,
      ROLLBACK_DECISIONS.noGo,
      noGoReasons,
      warnings,
      input,
    )
  }
  return report(
    ROLLBACK_STATUSES.readyForRehearsal,
    ROLLBACK_DECISIONS.ready,
    [],
    warnings,
    input,
  )
}

export function assertSafeRollbackPreflightArgs(argv) {
  if (argv.includes('--prod')) throw new Error('--prod is forbidden')
  if (argv.includes('--linked')) throw new Error('--linked is forbidden')
  const indexes = argv.flatMap((argument, index) => argument === '--input' ? [index] : [])
  if (indexes.length !== 1) throw new Error('Exactly one --input argument is required')
  const inputIndex = indexes[0] + 1
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
  const inputPath = assertSafeRollbackPreflightArgs(process.argv.slice(2))
  let input
  try {
    input = JSON.parse(readFileSync(inputPath, 'utf8'))
  } catch {
    input = null
  }
  const result = evaluateRollbackPreflight(input)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (result.decision !== ROLLBACK_DECISIONS.ready) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `rollback preflight refused: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    )
    process.exitCode = 1
  }
}
