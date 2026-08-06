#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  REQUIRED_ROLLBACK_EVIDENCE,
  REQUIRED_SMOKE_TESTS,
  ROLLBACK_DECISIONS,
  ROLLBACK_EVIDENCE_SOURCES,
  evaluateRollbackPreflight,
} from './rollback-preflight.mjs'

export const MAX_ROLLBACK_DURATION_MS = 1_800_000
export const PRIMARY_LOCAL_PORTS = Object.freeze([
  3000, 3001, 3210, 55320, 55321, 55322, 55323, 55324, 55325, 55327, 54329,
])
export const REHEARSAL_EVENTS = Object.freeze([
  'PREFLIGHT_STARTED',
  'PREFLIGHT_READY',
  'ARTIFACTS_PREPARED',
  'INCIDENT_STARTED',
  'INCIDENT_CONFIRMED',
  'ROLLBACK_REQUIRED_APPROVED',
  'INCIDENT_STOPPED',
  'HEALTHY_STARTED',
  'HEALTHY_READY',
  'SERVED_SHA_CONFIRMED',
  'SMOKE_TESTS_PASSED',
  'JOURNAL_RECORDED',
  'CLEANUP_COMPLETED',
])

const CONFIG_KEYS = Object.freeze([
  'environment',
  'branch',
  'rehearsalLabel',
  'incidentSha',
  'healthySha',
  'port',
  'stripeMode',
  'productionAuthorized',
  'approvals',
  'schemaCompatibility',
  'migrationAlignmentVerdict',
  'requestedCommands',
])
const SHA_PATTERN = /^[a-f0-9]{7,40}$/
const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])
const SECRET_PATTERN =
  /(?:\bBearer\s+\S+|\b(?:sk|pk|rk)_(?:live|test)_\S+|\bwhsec_\S+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|(?:password|secret|token|cookie|credential)\s*[=:]\s*\S+)/i

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function assertIsoTimestamp(value) {
  if (typeof value !== 'string'
    || Number.isNaN(Date.parse(value))
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error('INVALID_UTC_TIMESTAMP')
  }
}

export function assertLocalRehearsalUrl(value, label = 'rehearsal URL') {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`INVALID_LOCAL_URL:${label}`)
  }
  if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`REMOTE_URL_FORBIDDEN:${label}`)
  }
  if (url.username || url.password) throw new Error(`CREDENTIALS_FORBIDDEN:${label}`)
  return url
}

export function assertSafeRehearsalArgs(argv) {
  if (argv.includes('--prod')) throw new Error('--prod is forbidden')
  if (argv.includes('--linked')) throw new Error('--linked is forbidden')
  const indexes = argv.flatMap((argument, index) => argument === '--input' ? [index] : [])
  if (indexes.length !== 1) throw new Error('Exactly one --input argument is required')
  const inputIndex = indexes[0] + 1
  const input = argv[inputIndex]
  if (!input || input.startsWith('--')) throw new Error('Missing local rehearsal input path')
  argv.forEach((argument, index) => {
    if (index !== inputIndex && argument !== '--input') {
      throw new Error(`Unsupported argument: ${argument}`)
    }
  })
  try {
    const parsed = new URL(input)
    if (parsed.protocol) throw new Error('Rehearsal input must be an explicit local file')
  } catch (error) {
    if (error instanceof Error && error.message.includes('explicit local file')) throw error
  }
  return resolve(input)
}

export function assertRehearsalConfig(config) {
  if (!isRecord(config)
    || JSON.stringify(Object.keys(config).sort()) !== JSON.stringify([...CONFIG_KEYS].sort())) {
    throw new Error('INVALID_REHEARSAL_CONFIG')
  }
  if (config.environment !== 'local') throw new Error('PRODUCTION_ENVIRONMENT_FORBIDDEN')
  if (config.branch !== 'phase-6-staging') throw new Error('BRANCH_NOT_ALLOWED')
  if (!LABEL_PATTERN.test(config.rehearsalLabel)) throw new Error('INVALID_REHEARSAL_LABEL')
  if (!SHA_PATTERN.test(config.incidentSha) || !SHA_PATTERN.test(config.healthySha)) {
    throw new Error('INVALID_ARTIFACT_SHA')
  }
  if (config.incidentSha === config.healthySha) throw new Error('ARTIFACT_SHA_EQUAL')
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw new Error('INVALID_REHEARSAL_PORT')
  }
  if (PRIMARY_LOCAL_PORTS.includes(config.port)) throw new Error('PRIMARY_PORT_FORBIDDEN')
  assertLocalRehearsalUrl(`http://127.0.0.1:${config.port}`, 'configured service')
  if (config.stripeMode === 'live') throw new Error('STRIPE_LIVE_FORBIDDEN')
  if (!['disabled', 'test'].includes(config.stripeMode)) throw new Error('INVALID_STRIPE_MODE')
  if (config.productionAuthorized !== false) throw new Error('PRODUCTION_AUTHORIZATION_FORBIDDEN')
  if (config.schemaCompatibility !== 'LOCAL_REBUILT_COMPATIBLE') {
    throw new Error('LOCAL_SCHEMA_COMPATIBILITY_REQUIRED')
  }
  if (config.migrationAlignmentVerdict !== 'LOCAL_NOT_REQUIRED') {
    throw new Error('LOCAL_ALIGNMENT_CONTRACT_REQUIRED')
  }
  if (!isRecord(config.approvals)
    || JSON.stringify(Object.keys(config.approvals).sort())
      !== JSON.stringify(['approver', 'operator', 'timer'])
    || Object.values(config.approvals).some(value => value !== true)) {
    throw new Error('REHEARSAL_APPROVALS_REQUIRED')
  }
  if (!Array.isArray(config.requestedCommands)
    || config.requestedCommands.some(command => typeof command !== 'string')) {
    throw new Error('INVALID_REQUESTED_COMMANDS')
  }
  const serialized = JSON.stringify(config)
  if (SECRET_PATTERN.test(serialized)) throw new Error('SECRET_DETECTED')
  if (/https?:\/\//i.test(serialized)) throw new Error('REMOTE_URL_FORBIDDEN:config')
  return config
}

function artifactServerSource(descriptor) {
  return `import http from 'node:http'
const descriptor = ${JSON.stringify(descriptor)}
const port = Number(process.argv[2])
if (!Number.isInteger(port)) throw new Error('invalid port')
const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}
const server = http.createServer((request, response) => {
  if (request.method !== 'GET') return json(response, 405, { status: 'method_not_allowed' })
  if (request.url === '/health') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'ready', sha: descriptor.sha })
  if (request.url === '/sha') return json(response, 200, { sha: descriptor.sha })
  if (request.url === '/api/auth/health') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'local_auth_available' })
  if (request.url === '/api/rollback/read-only') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'ok', mutation: false })
  if (request.url === '/api/media/private/health') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'ok', publicExposure: false })
  if (request.url === '/api/billing/health') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'ok', stripeMode: 'test', mutation: false })
  if (request.url === '/') return json(response, descriptor.kind === 'incident' ? 503 : 200, { status: descriptor.kind === 'incident' ? 'degraded' : 'ok', sha: descriptor.sha })
  return json(response, 404, { status: 'not_found' })
})
server.listen(port, '127.0.0.1')
const stop = () => server.close(() => process.exit(0))
process.once('SIGTERM', stop)
process.once('SIGINT', stop)
`
}

export function createArtifactPlan(kind, sha) {
  if (!['incident', 'healthy'].includes(kind) || !SHA_PATTERN.test(sha)) {
    throw new Error('INVALID_ARTIFACT_PLAN')
  }
  const descriptor = Object.freeze({ schemaVersion: 1, kind, sha })
  const source = artifactServerSource(descriptor)
  const inventoryHash = sha256(`server.mjs\0${source}`)
  return Object.freeze({
    kind,
    sha,
    artifactId: `local-artifact-${inventoryHash}`,
    inventoryHash,
    source,
  })
}

export function assertDistinctArtifacts(incident, healthy) {
  if (incident.sha === healthy.sha) throw new Error('ARTIFACT_SHA_EQUAL')
  if (incident.artifactId === healthy.artifactId) throw new Error('ARTIFACT_ID_EQUAL')
  if (incident.inventoryHash === healthy.inventoryHash) throw new Error('ARTIFACT_INVENTORY_EQUAL')
}

function materializeArtifact(root, plan) {
  const directory = resolve(root, plan.kind)
  mkdirSync(directory, { recursive: false, mode: 0o700 })
  const serverPath = resolve(directory, 'server.mjs')
  const manifestPath = resolve(directory, 'artifact.json')
  writeFileSync(serverPath, plan.source, { mode: 0o400 })
  writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    kind: plan.kind,
    sha: plan.sha,
    artifactId: plan.artifactId,
    inventoryHash: plan.inventoryHash,
  })}\n`, { mode: 0o400 })
  chmodSync(serverPath, 0o400)
  chmodSync(manifestPath, 0o400)
  chmodSync(directory, 0o500)
  return { ...plan, directory, serverPath, manifestPath }
}

export function verifyMaterializedArtifact(artifact) {
  const source = readFileSync(artifact.serverPath, 'utf8')
  const manifest = JSON.parse(readFileSync(artifact.manifestPath, 'utf8'))
  const actualHash = sha256(`server.mjs\0${source}`)
  if (actualHash !== artifact.inventoryHash
    || manifest.inventoryHash !== artifact.inventoryHash
    || manifest.artifactId !== artifact.artifactId
    || manifest.sha !== artifact.sha
    || manifest.kind !== artifact.kind) {
    throw new Error('ARTIFACT_IMMUTABILITY_CHECK_FAILED')
  }
  return true
}

function localBaseUrl(port) {
  const value = `http://127.0.0.1:${port}`
  assertLocalRehearsalUrl(value)
  return value
}

function localRequest(baseUrl, path) {
  const base = assertLocalRehearsalUrl(baseUrl)
  const target = new URL(path, base)
  assertLocalRehearsalUrl(target.href)
  return fetch(target, { redirect: 'error', signal: AbortSignal.timeout(1_000) })
}

async function isPortOpen(port, timeoutMs = 250) {
  return await new Promise(resolvePort => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    const finish = value => {
      socket.destroy()
      resolvePort(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

function startArtifact(artifact, port) {
  verifyMaterializedArtifact(artifact)
  const child = spawn(process.execPath, [artifact.serverPath, String(port)], {
    cwd: artifact.directory,
    env: {},
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => {
    if (stderr.length < 4_096) stderr += chunk
  })
  child.once('error', error => {
    if (stderr.length < 4_096) stderr += error.message
  })
  return { child, pid: child.pid, kind: artifact.kind, stderr: () => stderr }
}

async function waitForResponse(baseUrl, expectedStatus, expectedSha, timeoutMs = 5_000) {
  const deadline = performance.now() + timeoutMs
  let lastStatus = null
  while (performance.now() < deadline) {
    try {
      const response = await localRequest(baseUrl, '/health')
      lastStatus = response.status
      const body = await response.json()
      if (response.status === expectedStatus && body.sha === expectedSha) return body
    } catch {
      // A local child may still be binding its port.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 25))
  }
  throw new Error(`LOCAL_SERVICE_NOT_READY:${String(lastStatus ?? 'unreachable')}`)
}

async function stopArtifact(handle, timeoutMs = 3_000) {
  if (!handle?.child || handle.child.exitCode !== null) return
  const closed = new Promise((resolveClose, rejectClose) => {
    const timeout = setTimeout(() => rejectClose(new Error('LOCAL_SERVICE_STOP_TIMEOUT')), timeoutMs)
    handle.child.once('close', code => {
      clearTimeout(timeout)
      if (code !== 0 && code !== null) rejectClose(new Error('LOCAL_SERVICE_STOP_FAILED'))
      else resolveClose()
    })
  })
  handle.child.kill('SIGTERM')
  await closed
}

function pidIsAlive(pid) {
  if (!Number.isInteger(pid)) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function runSmokeTests(baseUrl, healthySha, incidentPid) {
  const checks = []
  const request = async (path, validate) => {
    const response = await localRequest(baseUrl, path)
    const body = await response.json()
    if (response.status >= 500 || !validate(response, body)) {
      throw new Error(`SMOKE_TEST_FAILED:${path}`)
    }
    checks.push(path)
  }
  await request('/health', (response, body) => response.status === 200
    && body.status === 'ready' && body.sha === healthySha)
  await request('/', (response, body) => response.status === 200 && body.sha === healthySha)
  await request('/sha', (response, body) => response.status === 200 && body.sha === healthySha)
  await request('/api/auth/health', (response, body) => response.status === 200
    && body.status === 'local_auth_available')
  await request('/api/rollback/read-only', (response, body) => response.status === 200
    && body.status === 'ok' && body.mutation === false)
  await request('/api/media/private/health', (response, body) => response.status === 200
    && body.status === 'ok' && body.publicExposure === false)
  await request('/api/billing/health', (response, body) => response.status === 200
    && body.status === 'ok' && body.stripeMode === 'test' && body.mutation === false)
  if (pidIsAlive(incidentPid)) throw new Error('INCIDENT_PROCESS_STILL_ACTIVE')
  return Object.freeze({
    checks,
    authMode: 'synthetic-local-no-fixture',
    criticalFiveHundreds: 0,
    syntheticDataCreated: 0,
  })
}

function buildPreflightInput(config, incident, healthy, capturedAt) {
  const evidence = Object.fromEntries(REQUIRED_ROLLBACK_EVIDENCE.map(name => [
    name,
    {
      status: name === 'migrationAlignment' ? 'NOT_APPLICABLE' : 'PASS',
      source: ROLLBACK_EVIDENCE_SOURCES[name],
      capturedAt,
    },
  ]))
  return {
    environment: 'local',
    branch: config.branch,
    incidentSha: config.incidentSha,
    healthySha: config.healthySha,
    incidentArtifactId: incident.artifactId,
    healthyArtifactId: healthy.artifactId,
    artifactImmutabilityVerified: true,
    servedShaBefore: config.incidentSha,
    migrationAlignmentVerdict: config.migrationAlignmentVerdict,
    schemaCompatibility: config.schemaCompatibility,
    releaseCandidate: {
      incidentArtifactSha: config.incidentSha,
      healthyArtifactSha: config.healthySha,
    },
    approvals: config.approvals,
    backupCapability: { required: false, attested: false },
    requiredSmokeTests: [...REQUIRED_SMOKE_TESTS],
    evidence,
    stripeMode: config.stripeMode,
    requestedCommands: config.requestedCommands,
    productionAuthorized: false,
    startedAt: capturedAt,
  }
}

function validateDurations(timings) {
  const names = [
    'preflightMs',
    'incidentConfirmationMs',
    'rollbackActionMs',
    'platformWaitMs',
    'smokeTestsMs',
    'totalRollbackMs',
  ]
  for (const name of names) {
    if (!Number.isFinite(timings[name]) || timings[name] < 0) {
      throw new Error('INVALID_REHEARSAL_DURATION')
    }
  }
  if (timings.totalRollbackMs >= MAX_ROLLBACK_DURATION_MS) {
    throw new Error('ROLLBACK_DURATION_TARGET_MISSED')
  }
}

export function assertPublicRehearsalReport(report) {
  const serialized = JSON.stringify(report)
  if (SECRET_PATTERN.test(serialized)) throw new Error('REPORT_SECRET_DETECTED')
  if (/\/(?:Users|home)\//i.test(serialized)) throw new Error('REPORT_PERSONAL_PATH_DETECTED')
  if (/https?:\/\//i.test(serialized)) throw new Error('REPORT_URL_DETECTED')
  assertIsoTimestamp(report.startedAt)
  assertIsoTimestamp(report.completedAt)
  validateDurations(report.timings)
  if (JSON.stringify(report.events) !== JSON.stringify(REHEARSAL_EVENTS)) {
    throw new Error('REHEARSAL_EVENT_ORDER_INVALID')
  }
  return report
}

export function createDefaultRuntime() {
  return {
    runnerPid: process.pid,
    monotonicNow: () => performance.now(),
    wallNow: () => new Date().toISOString(),
    emitPlan: value => { process.stdout.write(`${JSON.stringify(value)}\n`) },
    createTemporaryRoot: label => {
      const path = mkdtempSync(join(tmpdir(), `moovx-rollback-${label}-`))
      return { path, id: basename(path) }
    },
    prepareArtifacts: (root, incident, healthy) => ({
      incident: materializeArtifact(root.path, incident),
      healthy: materializeArtifact(root.path, healthy),
    }),
    verifyArtifact: verifyMaterializedArtifact,
    isPortOpen,
    startService: startArtifact,
    confirmIncident: (baseUrl, sha) => waitForResponse(baseUrl, 503, sha),
    stopService: stopArtifact,
    isProcessAlive: pidIsAlive,
    waitHealthy: (baseUrl, sha) => waitForResponse(baseUrl, 200, sha),
    confirmServedSha: async (baseUrl, sha) => {
      const response = await localRequest(baseUrl, '/sha')
      const body = await response.json()
      if (response.status !== 200 || body.sha !== sha) throw new Error('SERVED_SHA_MISMATCH')
      return true
    },
    runSmokeTests,
    writeJournal: (root, journal) => {
      const path = resolve(root.path, 'journal.json')
      writeFileSync(path, `${JSON.stringify(journal)}\n`, { mode: 0o600 })
      return true
    },
    cleanup: async ({ root, handles, port }) => {
      for (const handle of handles.reverse()) {
        try { await stopArtifact(handle) } catch {}
      }
      if (root?.path) {
        try { chmodSync(resolve(root.path, 'incident'), 0o700) } catch {}
        try { chmodSync(resolve(root.path, 'healthy'), 0o700) } catch {}
        rmSync(root.path, { recursive: true, force: true })
      }
      if (await isPortOpen(port)) throw new Error('REHEARSAL_PORT_STILL_OPEN')
      return true
    },
  }
}

/**
 * @param {any} config
 * @param {any} runtime
 */
export async function runLocalRollbackRehearsal(config, runtime = createDefaultRuntime()) {
  assertRehearsalConfig(config)
  const incidentPlan = createArtifactPlan('incident', config.incidentSha)
  const healthyPlan = createArtifactPlan('healthy', config.healthySha)
  assertDistinctArtifacts(incidentPlan, healthyPlan)
  const events = []
  const handles = []
  const baseUrl = localBaseUrl(config.port)
  let root
  let report
  let cleanupComplete = false

  const event = name => {
    if (REHEARSAL_EVENTS[events.length] !== name) throw new Error(`UNEXPECTED_REHEARSAL_EVENT:${name}`)
    events.push(name)
  }

  try {
    if (await runtime.isPortOpen(config.port)) throw new Error('REHEARSAL_PORT_IN_USE')
    root = runtime.createTemporaryRoot(config.rehearsalLabel)
    const resolvedRoot = resolve(root.path)
    const allowedRoot = resolve(tmpdir())
    if (resolvedRoot === allowedRoot || !resolvedRoot.startsWith(`${allowedRoot}/`)) {
      throw new Error('NON_TEMPORARY_ROOT_FORBIDDEN')
    }

    runtime.emitPlan({
      event: 'LOCAL_ROLLBACK_REHEARSAL_PLAN',
      rehearsalId: config.rehearsalLabel,
      primaryPorts: PRIMARY_LOCAL_PORTS,
      rehearsalPort: config.port,
      temporaryRootId: root.id,
      runnerPid: runtime.runnerPid,
      incidentArtifactId: incidentPlan.artifactId,
      healthyArtifactId: healthyPlan.artifactId,
      incidentSha: config.incidentSha,
      healthySha: config.healthySha,
      artifactsDistinct: true,
    })

    event('PREFLIGHT_STARTED')
    const preflightStarted = runtime.monotonicNow()
    const preflight = evaluateRollbackPreflight(buildPreflightInput(
      config,
      incidentPlan,
      healthyPlan,
      runtime.wallNow(),
    ))
    const preflightMs = runtime.monotonicNow() - preflightStarted
    if (preflight.decision !== ROLLBACK_DECISIONS.ready) {
      throw new Error(`PREFLIGHT_NOT_READY:${preflight.decision}`)
    }
    event('PREFLIGHT_READY')

    const artifacts = runtime.prepareArtifacts(root, incidentPlan, healthyPlan)
    runtime.verifyArtifact(artifacts.incident)
    runtime.verifyArtifact(artifacts.healthy)
    event('ARTIFACTS_PREPARED')

    const incidentStarted = runtime.monotonicNow()
    const incidentHandle = runtime.startService(artifacts.incident, config.port)
    handles.push(incidentHandle)
    event('INCIDENT_STARTED')
    await runtime.confirmIncident(baseUrl, config.incidentSha)
    const incidentConfirmationMs = runtime.monotonicNow() - incidentStarted
    event('INCIDENT_CONFIRMED')

    const rollbackStartedAt = runtime.wallNow()
    assertIsoTimestamp(rollbackStartedAt)
    const rollbackStarted = runtime.monotonicNow()
    event('ROLLBACK_REQUIRED_APPROVED')

    const actionStarted = runtime.monotonicNow()
    await runtime.stopService(incidentHandle)
    if (incidentHandle.pid && runtime.isProcessAlive(incidentHandle.pid)) {
      throw new Error('INCIDENT_PROCESS_STILL_ACTIVE')
    }
    event('INCIDENT_STOPPED')
    runtime.verifyArtifact(artifacts.healthy)
    const healthyHandle = runtime.startService(artifacts.healthy, config.port)
    handles.push(healthyHandle)
    event('HEALTHY_STARTED')
    const rollbackActionMs = runtime.monotonicNow() - actionStarted

    const waitStarted = runtime.monotonicNow()
    await runtime.waitHealthy(baseUrl, config.healthySha)
    const platformWaitMs = runtime.monotonicNow() - waitStarted
    event('HEALTHY_READY')
    await runtime.confirmServedSha(baseUrl, config.healthySha)
    event('SERVED_SHA_CONFIRMED')

    const smokeStarted = runtime.monotonicNow()
    const smoke = await runtime.runSmokeTests(baseUrl, config.healthySha, incidentHandle.pid)
    if (smoke.checks.length !== REQUIRED_SMOKE_TESTS.length) {
      throw new Error('REQUIRED_SMOKE_TESTS_INCOMPLETE')
    }
    const smokeTestsMs = runtime.monotonicNow() - smokeStarted
    event('SMOKE_TESTS_PASSED')

    runtime.writeJournal(root, {
      rehearsalId: config.rehearsalLabel,
      environment: 'local-isolated',
      incidentSha: config.incidentSha,
      healthySha: config.healthySha,
      preflightDecision: preflight.decision,
      rollbackRequiredApprovedAt: rollbackStartedAt,
      smokeTestsPassed: true,
    })
    event('JOURNAL_RECORDED')
    const rollbackCompletedAt = runtime.wallNow()
    const totalRollbackMs = runtime.monotonicNow() - rollbackStarted
    const timings = {
      preflightMs,
      incidentConfirmationMs,
      rollbackActionMs,
      platformWaitMs,
      smokeTestsMs,
      totalRollbackMs,
    }
    validateDurations(timings)

    report = {
      rehearsalId: config.rehearsalLabel,
      environment: 'local-isolated',
      incidentSha: config.incidentSha,
      healthySha: config.healthySha,
      incidentArtifactId: incidentPlan.artifactId,
      healthyArtifactId: healthyPlan.artifactId,
      incidentArtifactInventoryHash: incidentPlan.inventoryHash,
      healthyArtifactInventoryHash: healthyPlan.inventoryHash,
      artifactImmutabilityVerified: true,
      artifactsDistinct: true,
      preflightDecision: preflight.decision,
      incidentConfirmed: true,
      rollbackSucceeded: true,
      servedShaConfirmed: true,
      smokeTestsPassed: true,
      smokeTestCount: smoke.checks.length,
      authMode: smoke.authMode,
      syntheticDataCreated: smoke.syntheticDataCreated,
      startedAt: rollbackStartedAt,
      completedAt: rollbackCompletedAt,
      timings,
      underThirtyMinutes: true,
      cleanupComplete: false,
      incidentProcessStopped: true,
      processIds: {
        runner: runtime.runnerPid,
        incident: incidentHandle.pid,
        healthy: healthyHandle.pid,
      },
      events: [...events],
      blockingReasons: [],
      warnings: [
        'LOCAL_SYNTHETIC_SERVER_NOT_PREVIEW_PROOF',
        'STAGING_DRIFT_REMAINS_NO_GO',
        'DATA_RESTORE_AND_PITR_NOT_EXERCISED',
      ],
    }
  } finally {
    cleanupComplete = await runtime.cleanup({ root, handles, port: config.port })
  }

  if (!report) throw new Error('REHEARSAL_REPORT_MISSING')
  report.cleanupComplete = cleanupComplete === true
  if (!report.cleanupComplete) throw new Error('REHEARSAL_CLEANUP_INCOMPLETE')
  report.events.push('CLEANUP_COMPLETED')
  return assertPublicRehearsalReport(report)
}

async function main() {
  const inputPath = assertSafeRehearsalArgs(process.argv.slice(2))
  let input
  try {
    input = JSON.parse(readFileSync(inputPath, 'utf8'))
  } catch {
    throw new Error('INVALID_REHEARSAL_CONFIG')
  }
  const report = await runLocalRollbackRehearsal(input)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(
      `Local rollback rehearsal failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    )
    process.exitCode = 1
  })
}
