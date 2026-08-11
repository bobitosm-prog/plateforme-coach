import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { performance } from 'node:perf_hooks'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readNutritionJournalCycle } from '../../lib/nutrition/nutrition-journal-read-model.ts'
import { createBoundedResourceSampler } from './targeted-load-observability.mjs'
import {
  NUTRITION_LOAD_CLIENTS,
  NUTRITION_LOAD_DAYS,
  NUTRITION_LOAD_LOGS_PER_DAY,
  NUTRITION_LOAD_OPERATION,
  NUTRITION_LOAD_PROFILE,
  NUTRITION_LOAD_RETRIES,
  NUTRITION_LOAD_SMOKE_REQUESTS,
  NUTRITION_LOAD_TARGET,
  NUTRITION_LOAD_TIMEOUT_MS,
  NUTRITION_LOAD_WATER_ROWS_PER_CLIENT,
  assertNutritionFixtureCardinality,
  assertNutritionLoadContract,
  assertPreviousCleanupConfirmed,
  sanitizeLoadRecord,
  summarizeNutritionLoadPhase,
} from './nutrition-targeted-load-contract.mjs'

const STATE_PATH = join(tmpdir(), 'moovx-nutrition-targeted-load-cleanup-state.json')
const RESOURCE_INTERVAL_MS = 5_000
const args = process.argv.slice(2)
if (args.some(argument => argument !== '--smoke') || args.filter(argument => argument === '--smoke').length > 1) {
  throw new Error('INVALID_NUTRITION_LOAD_ARGUMENTS')
}
const smoke = args.includes('--smoke')

loadEnv({ path: '.env.e2e.local', quiet: true, override: false })

const supabaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

assertNutritionLoadContract({
  supabaseUrl,
  env: process.env,
  target: NUTRITION_LOAD_TARGET,
  operation: NUTRITION_LOAD_OPERATION,
  timeoutMs: NUTRITION_LOAD_TIMEOUT_MS,
  retries: NUTRITION_LOAD_RETRIES,
  profile: NUTRITION_LOAD_PROFILE,
})
if (!anonKey || !serviceRoleKey) throw new Error('LOCAL_SUPABASE_KEYS_REQUIRED')

function readCleanupState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw new Error('NUTRITION_LOAD_CLEANUP_STATE_INVALID')
  }
}

function writeCleanupState(state) {
  writeFileSync(STATE_PATH, `${JSON.stringify(sanitizeLoadRecord(state))}\n`, { mode: 0o600 })
}

assertPreviousCleanupConfirmed(readCleanupState())

const correlationId = `nutrition-load-${Date.now()}-${randomUUID().slice(0, 8)}`
const artifactPath = join(tmpdir(), `moovx-nutrition-targeted-load-${correlationId}.json`)
const selectedDate = new Date().toISOString().slice(0, 10)
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const fixtureIds = []
const authenticatedClients = []
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
  const [dailyFoodLogs, waterIntake, profiles, relations, authUsers] = await Promise.all([
    databaseCount('daily_food_logs'),
    databaseCount('water_intake'),
    databaseCount('profiles'),
    databaseCount('coach_clients'),
    authUserCount(),
  ])
  return { dailyFoodLogs, waterIntake, profiles, relations, authUsers }
}

function dateAtOffset(daysAgo) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)
}

async function createAuthenticatedClient(email, password, expectedUserId) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || data.user?.id !== expectedUserId) throw new Error('LOCAL_NUTRITION_SIGN_IN_FAILED')
  return client
}

async function prepareFixtures() {
  baselineCounts = await captureGlobalCounts()
  const { count: existingLogs, error: existingLogsError } = await admin.from('daily_food_logs')
    .select('*', { count: 'exact', head: true }).like('custom_name', `${correlationId}%`)
  if (existingLogsError || existingLogs !== 0) throw new Error('NUTRITION_LOAD_FIXTURE_SCOPE_NOT_EMPTY')

  for (let clientIndex = 0; clientIndex < NUTRITION_LOAD_CLIENTS; clientIndex += 1) {
    const id = randomUUID()
    const email = `nutrition-load+${correlationId}-${clientIndex}@moovx.example.test`
    const password = `Local-${randomUUID()}-A1!`
    fixtureIds.push(id)
    const { error: userError } = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'client', fixture: correlationId },
    })
    if (userError) throw new Error('LOCAL_NUTRITION_AUTH_CREATE_FAILED')
    const { error: profileError } = await admin.from('profiles').upsert({
      id,
      email,
      full_name: `Nutrition Load Client ${clientIndex + 1}`,
      role: 'client',
      subscription_type: 'client_monthly',
      subscription_status: 'active',
      onboarding_completed: true,
      calorie_goal: 2_200,
      protein_goal: 160,
      carbs_goal: 240,
      fat_goal: 70,
    })
    if (profileError) throw new Error('LOCAL_NUTRITION_PROFILE_CREATE_FAILED')

    const logs = []
    for (let day = 0; day < NUTRITION_LOAD_DAYS; day += 1) {
      for (let entry = 0; entry < NUTRITION_LOAD_LOGS_PER_DAY; entry += 1) {
        logs.push({
          user_id: id,
          date: dateAtOffset(day),
          meal_type: ['petit_dejeuner', 'dejeuner', 'collation', 'diner'][entry % 4],
          food_id: null,
          custom_name: `${correlationId}-food-${clientIndex}-${day}-${entry}`,
          quantity_g: 100,
          calories: 100 + entry,
          protein: 10 + entry,
          carbs: 12 + entry,
          fat: 4 + entry,
        })
      }
    }
    const { error: logsError } = await admin.from('daily_food_logs').insert(logs)
    if (logsError) throw new Error('LOCAL_NUTRITION_LOG_CREATE_FAILED')

    const waterRows = Array.from({ length: NUTRITION_LOAD_WATER_ROWS_PER_CLIENT }, (_, index) => ({
      user_id: id,
      date: selectedDate,
      amount_ml: 200 + index * 25,
    }))
    const { error: waterError } = await admin.from('water_intake').insert(waterRows)
    if (waterError) throw new Error('LOCAL_NUTRITION_WATER_CREATE_FAILED')

    authenticatedClients.push(await createAuthenticatedClient(email, password, id))
  }

  const [logs, water] = await Promise.all([
    admin.from('daily_food_logs').select('*', { count: 'exact', head: true }).in('user_id', fixtureIds),
    admin.from('water_intake').select('*', { count: 'exact', head: true }).in('user_id', fixtureIds),
  ])
  if (logs.error || water.error) throw new Error('NUTRITION_LOAD_FIXTURE_AUDIT_FAILED')
  assertNutritionFixtureCardinality({
    clients: authenticatedClients.length,
    logs: logs.count,
    water: water.count,
  })
}

async function cleanupFixtures() {
  if (cleanupStarted) return cleanupConfirmed
  cleanupStarted = true
  const failures = []
  const captureFailure = code => failures.push(code)
  if (fixtureIds.length) {
    const { error: waterError } = await admin.from('water_intake').delete().in('user_id', fixtureIds)
    if (waterError) captureFailure('WATER_CLEANUP_FAILED')
    const { error: logsError } = await admin.from('daily_food_logs').delete().in('user_id', fixtureIds)
    if (logsError) captureFailure('NUTRITION_LOG_CLEANUP_FAILED')
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

  const [logsLeft, waterLeft, profilesLeft] = fixtureIds.length
    ? await Promise.all([
      admin.from('daily_food_logs').select('*', { count: 'exact', head: true }).in('user_id', fixtureIds),
      admin.from('water_intake').select('*', { count: 'exact', head: true }).in('user_id', fixtureIds),
      admin.from('profiles').select('*', { count: 'exact', head: true }).in('id', fixtureIds),
    ])
    : [{ count: 0, error: null }, { count: 0, error: null }, { count: 0, error: null }]
  if (logsLeft.error || logsLeft.count !== 0) captureFailure('NUTRITION_LOG_RESIDUE')
  if (waterLeft.error || waterLeft.count !== 0) captureFailure('WATER_RESIDUE')
  if (profilesLeft.error || profilesLeft.count !== 0) captureFailure('PROFILE_RESIDUE')
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
  if (!cleanupConfirmed) throw new Error(`NUTRITION_LOAD_CLEANUP_FAILED:${failures.join(',')}`)
  return true
}

function sampleLocalResources() {
  const processResult = spawnSync('ps', ['-p', String(process.pid), '-o', '%cpu=,rss='], { encoding: 'utf8' })
  const processValues = processResult.status === 0
    ? processResult.stdout.trim().split(/\s+/).map(Number)
    : []
  const postgresResult = spawnSync(
    'psql',
    ['-h', '127.0.0.1', '-p', '55322', '-U', 'postgres', '-d', 'postgres', '-Atq', '-F', '|', '-c', [
      'SELECT',
      'count(*) FILTER (WHERE datname = current_database()),',
      "count(*) FILTER (WHERE state = 'active' AND pid <> pg_backend_pid()),",
      "count(*) FILTER (WHERE wait_event_type = 'Lock'),",
      "count(*) FILTER (WHERE state = 'active' AND pid <> pg_backend_pid() AND now() - query_start > interval '1 second')",
      'FROM pg_stat_activity;',
    ].join(' ')],
    { encoding: 'utf8', env: { ...process.env, PGPASSWORD: 'postgres' } },
  )
  const postgresValues = postgresResult.status === 0
    ? postgresResult.stdout.trim().split('|').map(Number)
    : []
  return {
    observedAt: new Date().toISOString(),
    runner: processValues.length === 2
      ? { cpuPercent: processValues[0], rssBytes: processValues[1] * 1_024 }
      : { status: 'NON_MESUREE' },
    postgres: postgresValues.length === 4
      ? {
        connections: postgresValues[0],
        activeConnections: postgresValues[1],
        lockWaits: postgresValues[2],
        queriesOverOneSecond: postgresValues[3],
      }
      : { status: 'NON_MESUREE' },
  }
}

async function issueRead(phase, client, sequence) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), NUTRITION_LOAD_TIMEOUT_MS)
  const correlation = `${correlationId}.${String(sequence).padStart(6, '0')}`
  try {
    const result = await readNutritionJournalCycle({
      client,
      userId: fixtureIds[sequence % fixtureIds.length],
      selectedDate,
      profile: { calorie_goal: 2_200, protein_goal: 160, carbs_goal: 240, fat_goal: 70 },
      correlationId: correlation,
      signal: AbortSignal.any([controller.signal, runAbortController.signal]),
      instrumentation: { enabled: true },
    })
    return sanitizeLoadRecord({
      timestamp: new Date().toISOString(),
      phase,
      sequence,
      completed: result.status === 'success',
      timeout: controller.signal.aborted && !runAbortController.signal.aborted,
      metrics: result.metrics,
      summaryStatus: result.status === 'success' ? result.summary.consumption.status : 'error',
    })
  } catch {
    return {
      timestamp: new Date().toISOString(),
      phase,
      sequence,
      completed: false,
      timeout: controller.signal.aborted && !runAbortController.signal.aborted,
      metrics: null,
      summaryStatus: 'error',
    }
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
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
      const request = issueRead(
        phase.name,
        authenticatedClients[sampleIndex % authenticatedClients.length],
        sampleIndex,
      ).then(sample => allSamples.push(sample)).finally(() => inFlight.delete(request))
      inFlight.add(request)
      maxConcurrency = Math.max(maxConcurrency, inFlight.size)
    }
    await sleep(25)
  }
  await Promise.allSettled(inFlight)
  const elapsedMs = performance.now() - startedAt
  const phaseSamples = allSamples.filter(sample => sample.phase === phase.name)
  return summarizeNutritionLoadPhase({ phase, samples: phaseSamples, elapsedMs, maxConcurrency })
}

async function runSmoke(samples) {
  const startedAt = performance.now()
  const sample = await issueRead('smoke', authenticatedClients[0], 0)
  samples.push(sample)
  const phase = { name: 'smoke', startRps: 1, endRps: 1 }
  return summarizeNutritionLoadPhase({
    phase,
    samples,
    elapsedMs: performance.now() - startedAt,
    maxConcurrency: 1,
  })
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
const resourceSampler = createBoundedResourceSampler({ sample: sampleLocalResources, intervalMs: RESOURCE_INTERVAL_MS })
let runError = null
try {
  writeCleanupState({ cleanupConfirmed: false, correlationId, startedAt: new Date().toISOString() })
  await prepareFixtures()
  await resourceSampler.start()
  if (smoke) {
    if (NUTRITION_LOAD_SMOKE_REQUESTS !== 1) throw new Error('NUTRITION_LOAD_SMOKE_CONTRACT_INVALID')
    summaries.push(await runSmoke(samples))
  } else {
    for (const phase of NUTRITION_LOAD_PROFILE) {
      if (runAbortController.signal.aborted) break
      summaries.push(await runPhase(phase, samples))
    }
  }
  if (runAbortController.signal.aborted) throw new Error('NUTRITION_LOAD_INTERRUPTED')
  if (samples.some(sample => !sample.completed)) throw new Error('NUTRITION_LOAD_READ_CONTRACT_FAILED')
  if (smoke) {
    const metrics = samples[0]?.metrics
    if (!metrics || metrics.journal_count !== NUTRITION_LOAD_LOGS_PER_DAY
      || metrics.calendar_count !== NUTRITION_LOAD_DAYS * NUTRITION_LOAD_LOGS_PER_DAY
      || metrics.water_count !== NUTRITION_LOAD_WATER_ROWS_PER_CLIENT) {
      throw new Error('NUTRITION_LOAD_SMOKE_CARDINALITY_INVALID')
    }
  }
} catch (error) {
  runError = error
} finally {
  await resourceSampler.stop()
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
  target: NUTRITION_LOAD_TARGET,
  operation: NUTRITION_LOAD_OPERATION,
  profile: smoke ? { requests: NUTRITION_LOAD_SMOKE_REQUESTS } : NUTRITION_LOAD_PROFILE,
  timeoutMs: NUTRITION_LOAD_TIMEOUT_MS,
  retries: NUTRITION_LOAD_RETRIES,
  fixtures: {
    clients: NUTRITION_LOAD_CLIENTS,
    dailyFoodLogs: NUTRITION_LOAD_CLIENTS * NUTRITION_LOAD_DAYS * NUTRITION_LOAD_LOGS_PER_DAY,
    waterIntake: NUTRITION_LOAD_CLIENTS * NUTRITION_LOAD_WATER_ROWS_PER_CLIENT,
  },
  summaries,
  samples,
  resources: resourceSampler.snapshot(),
  cleanupConfirmed,
  completedAt: new Date().toISOString(),
  outcome: runError ? 'FAILED' : 'MEASURED_WITHOUT_CAPACITY_VERDICT',
})
writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
process.stdout.write(`${JSON.stringify(sanitizeLoadRecord({
  outcome: report.outcome,
  mode: report.mode,
  target: report.target,
  summaries,
  cleanupConfirmed,
  artifactPath,
}))}\n`)
if (runError) {
  process.stderr.write(`${sanitizeLoadRecord(runError.message || 'NUTRITION_LOAD_FAILED')}\n`)
  process.exitCode = interruptedSignal ? 130 : 1
}
