import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { performance } from 'node:perf_hooks'
import { randomUUID } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  TARGETED_LOAD_METHOD,
  TARGETED_LOAD_PROFILE,
  TARGETED_LOAD_RETRIES,
  TARGETED_LOAD_ROUTE,
  TARGETED_LOAD_SMOKE_PROFILE,
  TARGETED_LOAD_TIMEOUT_MS,
  assertPreviousCleanupConfirmed,
  assertSafeRedirect,
  assertTargetedLoadContract,
  sanitizeLoadRecord,
  summarizeLoadPhase,
} from './targeted-load-contract.mjs'

const CLIENT_COUNT = 5
const REPORTS_PER_CLIENT = 20
const STATE_PATH = join(tmpdir(), 'moovx-targeted-load-cleanup-state.json')
const args = process.argv.slice(2)
if (args.some(argument => argument !== '--smoke') || args.filter(argument => argument === '--smoke').length > 1) {
  throw new Error('INVALID_TARGETED_LOAD_ARGUMENTS')
}
const smoke = args.includes('--smoke')
const profile = smoke ? TARGETED_LOAD_SMOKE_PROFILE : TARGETED_LOAD_PROFILE

loadEnv({ path: '.env.e2e.local', quiet: true, override: false })

const appUrl = process.env.MOOVX_TARGETED_LOAD_APP_URL || 'http://127.0.0.1:3000'
const supabaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

assertTargetedLoadContract({
  appUrl,
  supabaseUrl,
  env: process.env,
  route: TARGETED_LOAD_ROUTE,
  method: TARGETED_LOAD_METHOD,
  timeoutMs: TARGETED_LOAD_TIMEOUT_MS,
  retries: TARGETED_LOAD_RETRIES,
  profile,
})
if (!anonKey || !serviceRoleKey) throw new Error('LOCAL_SUPABASE_KEYS_REQUIRED')

function readCleanupState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw new Error('TARGETED_LOAD_CLEANUP_STATE_INVALID')
  }
}

function writeCleanupState(state) {
  writeFileSync(STATE_PATH, `${JSON.stringify(sanitizeLoadRecord(state))}\n`, { mode: 0o600 })
}

assertPreviousCleanupConfirmed(readCleanupState())

const correlationId = `load-${Date.now()}-${randomUUID().slice(0, 8)}`
const fixtureMarker = `/__targeted-load__/${correlationId}`
const artifactPath = join(tmpdir(), `moovx-targeted-load-${correlationId}.json`)
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const fixtureIds = []
const sessionCookies = []
const runAbortController = new AbortController()
let cleanupStarted = false
let cleanupConfirmed = false
let interruptedSignal = null
let baselineCounts = null

function databaseCount(table) {
  return admin.from(table).select('*', { count: 'exact', head: true }).then(({ count, error }) => {
    if (error || count === null) throw new Error(`LOCAL_${table.toUpperCase()}_COUNT_FAILED`)
    return count
  })
}

async function authUserCount() {
  let page = 1
  let total = 0
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 })
    if (error) throw new Error('LOCAL_AUTH_COUNT_FAILED')
    total += data.users.length
    if (data.users.length < 1_000) return total
    page += 1
  }
}

async function captureGlobalCounts() {
  const [bugReports, profiles, relations, authUsers] = await Promise.all([
    databaseCount('bug_reports'),
    databaseCount('profiles'),
    databaseCount('coach_clients'),
    authUserCount(),
  ])
  return { bugReports, profiles, relations, authUsers }
}

async function createSessionCookie(email, password) {
  const jar = new Map()
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error || jar.size === 0) throw new Error('LOCAL_SYNTHETIC_SIGN_IN_FAILED')
  return [...jar].map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('; ')
}

async function prepareFixtures() {
  baselineCounts = await captureGlobalCounts()
  const { count: existing, error: existingError } = await admin
    .from('bug_reports').select('*', { count: 'exact', head: true }).eq('page_url', fixtureMarker)
  if (existingError || existing !== 0) throw new Error('LOAD_FIXTURE_SCOPE_NOT_EMPTY')

  for (let clientIndex = 0; clientIndex < CLIENT_COUNT; clientIndex += 1) {
    const id = randomUUID()
    const email = `targeted-load+${correlationId}-${clientIndex}@moovx.example.test`
    const password = `Local-${randomUUID()}-A1!`
    fixtureIds.push(id)
    const { error: userError } = await admin.auth.admin.createUser({
      id, email, password, email_confirm: true, user_metadata: { role: 'client', fixture: correlationId },
    })
    if (userError) throw new Error('LOCAL_SYNTHETIC_AUTH_CREATE_FAILED')
    const { error: profileError } = await admin.from('profiles').upsert({
      id,
      email,
      full_name: `Targeted Load Client ${clientIndex + 1}`,
      role: 'client',
      subscription_type: 'client_monthly',
      subscription_status: 'active',
      onboarding_completed: true,
    })
    if (profileError) throw new Error('LOCAL_SYNTHETIC_PROFILE_CREATE_FAILED')
    const reports = Array.from({ length: REPORTS_PER_CLIENT }, (_, reportIndex) => ({
      user_id: id,
      user_email: email,
      user_role: 'client',
      type: 'bug',
      title: `${correlationId} report ${reportIndex + 1}`,
      description: 'Synthetic targeted-load fixture',
      page_url: fixtureMarker,
      status: 'nouveau',
      priority: 'normal',
    }))
    const { error: reportError } = await admin.from('bug_reports').insert(reports)
    if (reportError) throw new Error('LOCAL_SYNTHETIC_REPORT_CREATE_FAILED')
    sessionCookies.push(await createSessionCookie(email, password))
  }

  const { count, error } = await admin
    .from('bug_reports').select('*', { count: 'exact', head: true }).eq('page_url', fixtureMarker)
  if (error || count !== CLIENT_COUNT * REPORTS_PER_CLIENT) throw new Error('LOAD_FIXTURE_CARDINALITY_INVALID')
}

async function cleanupFixtures() {
  if (cleanupStarted) return cleanupConfirmed
  cleanupStarted = true
  const failures = []
  const captureFailure = code => failures.push(code)
  const { error: reportError } = await admin.from('bug_reports').delete().eq('page_url', fixtureMarker)
  if (reportError) captureFailure('BUG_REPORT_CLEANUP_FAILED')
  if (fixtureIds.length) {
    const { error: relationError } = await admin.from('coach_clients').delete()
      .or(`coach_id.in.(${fixtureIds.join(',')}),client_id.in.(${fixtureIds.join(',')})`)
    if (relationError) captureFailure('RELATION_CLEANUP_FAILED')
    const { error: profileError } = await admin.from('profiles').delete().in('id', fixtureIds)
    if (profileError) captureFailure('PROFILE_CLEANUP_FAILED')
    for (const id of [...fixtureIds].reverse()) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error && !error.message.toLowerCase().includes('not found')) captureFailure('AUTH_CLEANUP_FAILED')
    }
  }

  const { count: reportsLeft, error: reportAuditError } = await admin
    .from('bug_reports').select('*', { count: 'exact', head: true }).eq('page_url', fixtureMarker)
  const { count: profilesLeft, error: profileAuditError } = fixtureIds.length
    ? await admin.from('profiles').select('*', { count: 'exact', head: true }).in('id', fixtureIds)
    : { count: 0, error: null }
  if (reportAuditError || reportsLeft !== 0) captureFailure('BUG_REPORT_RESIDUE')
  if (profileAuditError || profilesLeft !== 0) captureFailure('PROFILE_RESIDUE')
  for (const id of fixtureIds) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (!error || data?.user) captureFailure('AUTH_USER_RESIDUE')
  }
  if (baselineCounts) {
    const finalCounts = await captureGlobalCounts().catch(() => null)
    if (!finalCounts || JSON.stringify(finalCounts) !== JSON.stringify(baselineCounts)) {
      captureFailure('OUT_OF_SCOPE_COUNT_CHANGED')
    }
  }
  cleanupConfirmed = failures.length === 0
  writeCleanupState({ cleanupConfirmed, correlationId, checkedAt: new Date().toISOString(), failures })
  if (!cleanupConfirmed) throw new Error(`TARGETED_LOAD_CLEANUP_FAILED:${failures.join(',')}`)
  return true
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function issueRead(phaseName, cookie, sequence) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), TARGETED_LOAD_TIMEOUT_MS)
  const startedAt = performance.now()
  let status = 0
  let requestId = null
  const expectedRequestId = `${correlationId}.${String(sequence).padStart(6, '0')}`
  let timeoutReached = false
  let networkError = null
  try {
    const response = await fetch(new URL(TARGETED_LOAD_ROUTE, appUrl), {
      method: TARGETED_LOAD_METHOD,
      headers: { accept: 'application/json', cookie, 'x-request-id': expectedRequestId },
      redirect: 'manual',
      signal: AbortSignal.any([controller.signal, runAbortController.signal]),
    })
    status = response.status
    requestId = response.headers.get('x-request-id')
    if (status >= 300 && status < 400) assertSafeRedirect(appUrl, response.headers.get('location'))
    await response.arrayBuffer()
  } catch {
    timeoutReached = controller.signal.aborted && !runAbortController.signal.aborted
    networkError = timeoutReached ? 'TIMEOUT' : runAbortController.signal.aborted ? 'RUN_INTERRUPTED' : 'NETWORK_ERROR'
  } finally {
    clearTimeout(timeout)
  }
  return {
    timestamp: new Date().toISOString(),
    phase: phaseName,
    sequence,
    status,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    completed: status > 0,
    timeout: timeoutReached,
    networkError,
    requestId,
    requestIdMatched: requestId === expectedRequestId,
  }
}

async function runPhase(phase, allSamples) {
  const startedAt = performance.now()
  let lastTick = startedAt
  let credit = 0
  let sequence = allSamples.length
  let maxConcurrency = 0
  const inFlight = new Set()
  while (!runAbortController.signal.aborted) {
    const now = performance.now()
    const elapsedMs = now - startedAt
    if (elapsedMs >= phase.durationSeconds * 1_000) break
    const progress = elapsedMs / (phase.durationSeconds * 1_000)
    const allowedConcurrency = Math.max(1, Math.floor(phase.startVus + ((phase.endVus - phase.startVus) * progress)))
    const rps = phase.startRps + ((phase.endRps - phase.startRps) * progress)
    credit = Math.min(allowedConcurrency, credit + (rps * (now - lastTick) / 1_000))
    lastTick = now
    while (credit >= 1 && inFlight.size < allowedConcurrency) {
      credit -= 1
      const sampleIndex = sequence
      sequence += 1
      const request = issueRead(phase.name, sessionCookies[sampleIndex % sessionCookies.length], sampleIndex)
        .then(sample => allSamples.push(sample))
        .finally(() => inFlight.delete(request))
      inFlight.add(request)
      maxConcurrency = Math.max(maxConcurrency, inFlight.size)
    }
    await sleep(25)
  }
  await Promise.allSettled(inFlight)
  const elapsedMs = performance.now() - startedAt
  const phaseSamples = allSamples.filter(sample => sample.phase === phase.name)
  return summarizeLoadPhase({ phase, samples: phaseSamples, elapsedMs, maxConcurrency })
}

function handleSignal(signal) {
  interruptedSignal = signal
  runAbortController.abort(signal)
}
const handleSigint = () => handleSignal('SIGINT')
const handleSigterm = () => handleSignal('SIGTERM')
process.once('SIGINT', handleSigint)
process.once('SIGTERM', handleSigterm)

const samples = []
const summaries = []
let runError = null
try {
  writeCleanupState({ cleanupConfirmed: false, correlationId, startedAt: new Date().toISOString() })
  await prepareFixtures()
  for (const phase of profile) {
    if (runAbortController.signal.aborted) break
    summaries.push(await runPhase(phase, samples))
  }
  if (runAbortController.signal.aborted) throw new Error('TARGETED_LOAD_INTERRUPTED')
  if (samples.some(sample => sample.status !== 200)) throw new Error('TARGETED_LOAD_HTTP_CONTRACT_FAILED')
} catch (error) {
  runError = error
} finally {
  try {
    await cleanupFixtures()
  } catch (cleanupError) {
    runError = cleanupError
  }
  process.removeListener('SIGINT', handleSigint)
  process.removeListener('SIGTERM', handleSigterm)
}

const report = sanitizeLoadRecord({
  schemaVersion: 1,
  mode: smoke ? 'smoke' : 'full',
  correlationId,
  route: `${TARGETED_LOAD_METHOD} ${TARGETED_LOAD_ROUTE}`,
  profile,
  timeoutMs: TARGETED_LOAD_TIMEOUT_MS,
  retries: TARGETED_LOAD_RETRIES,
  fixtures: { clients: CLIENT_COUNT, reportsPerClient: REPORTS_PER_CLIENT },
  summaries,
  samples,
  cleanupConfirmed,
  completedAt: new Date().toISOString(),
  outcome: runError ? 'FAILED' : 'MEASURED_WITHOUT_CAPACITY_VERDICT',
})
writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
process.stdout.write(`${JSON.stringify(sanitizeLoadRecord({
  outcome: report.outcome,
  mode: report.mode,
  route: report.route,
  summaries,
  cleanupConfirmed,
  artifactPath,
}))}\n`)
if (runError) {
  process.stderr.write(`${sanitizeLoadRecord(runError.message || 'TARGETED_LOAD_FAILED')}\n`)
  process.exitCode = interruptedSignal ? 130 : 1
}
