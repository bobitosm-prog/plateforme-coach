import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { config as loadEnv } from 'dotenv'
import { isPortOpen, redactE2eOutput } from '../e2e-local-contract.mjs'
import {
  TARGETED_LOAD_METHOD,
  TARGETED_LOAD_PROFILE,
  TARGETED_LOAD_RETRIES,
  TARGETED_LOAD_ROUTE,
  TARGETED_LOAD_SMOKE_PROFILE,
  TARGETED_LOAD_TIMEOUT_MS,
  assertTargetedLoadContract,
  sanitizeLoadRecord,
} from './targeted-load-contract.mjs'
import {
  correlateTargetedLoadSamples,
  createBoundedResourceSampler,
  createTargetedLoadServerCollector,
} from './targeted-load-observability.mjs'

const APP_PORT = 3212
const APP_URL = `http://127.0.0.1:${APP_PORT}`
const BUILD_DIR = '.next-targeted-load-observed'
const RESOURCE_INTERVAL_MS = 5_000
const args = process.argv.slice(2)
if (args.some((argument) => argument !== '--smoke') || args.filter((argument) => argument === '--smoke').length > 1) {
  throw new Error('INVALID_TARGETED_LOAD_ARGUMENTS')
}
const smoke = args.includes('--smoke')

loadEnv({ path: '.env.e2e.local', quiet: true, override: false })

const supabaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const profile = smoke ? TARGETED_LOAD_SMOKE_PROFILE : TARGETED_LOAD_PROFILE
const originalTsconfig = readFileSync('tsconfig.json', 'utf8')

assertTargetedLoadContract({
  appUrl: APP_URL,
  supabaseUrl,
  env: process.env,
  route: TARGETED_LOAD_ROUTE,
  method: TARGETED_LOAD_METHOD,
  timeoutMs: TARGETED_LOAD_TIMEOUT_MS,
  retries: TARGETED_LOAD_RETRIES,
  profile,
})
if (!anonKey || !serviceRoleKey) throw new Error('LOCAL_SUPABASE_KEYS_REQUIRED')

const serverCollector = createTargetedLoadServerCollector()
let serverProcess = null
let loadProcess = null
let interruptedSignal = null

function childEnvironment() {
  return {
    ...process.env,
    MOOVX_E2E: '1',
    MOOVX_BUILD_DIR: BUILD_DIR,
    MOOVX_TARGETED_LOAD_APP_URL: APP_URL,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: APP_URL,
    NEXT_PUBLIC_SITE_URL: APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  }
}

function terminateProcessGroup(child, signal) {
  if (!child?.pid || child.exitCode !== null) return
  try {
    process.kill(-child.pid, signal)
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

function waitForExit(child, timeoutMs = 5_000) {
  if (!child || child.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return
  terminateProcessGroup(child, 'SIGTERM')
  await waitForExit(child)
  if (child.exitCode === null) {
    terminateProcessGroup(child, 'SIGKILL')
    await waitForExit(child, 1_000)
  }
}

function collectServerStream(stream) {
  if (!stream) return
  createInterface({ input: stream }).on('line', (line) => {
    try {
      serverCollector.ingest(line)
    } catch (error) {
      terminateProcessGroup(loadProcess, 'SIGTERM')
      process.stderr.write(`${redactE2eOutput(error.message)}\n`)
    }
  })
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverProcess?.exitCode !== null) throw new Error('TARGETED_LOAD_LOCAL_SERVER_EXITED')
    try {
      const response = await fetch(`${APP_URL}${TARGETED_LOAD_ROUTE}`, { redirect: 'manual' })
      await response.arrayBuffer()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error('TARGETED_LOAD_LOCAL_SERVER_UNAVAILABLE')
}

function runBuild(env) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'build', '--webpack'],
    { env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  )
  if (result.status !== 0) throw new Error('TARGETED_LOAD_LOCAL_BUILD_FAILED')
  for (const required of ['BUILD_ID', 'routes-manifest.json', 'server/app-paths-manifest.json']) {
    if (!existsSync(`${BUILD_DIR}/${required}`)) {
      throw new Error(`TARGETED_LOAD_LOCAL_BUILD_INCOMPLETE:${required}`)
    }
  }
}

function sampleLocalResources() {
  const observedAt = new Date().toISOString()
  const processResult = serverProcess?.pid
    ? spawnSync('ps', ['-p', String(serverProcess.pid), '-o', '%cpu=,rss='], { encoding: 'utf8' })
    : null
  const processValues = processResult?.status === 0
    ? processResult.stdout.trim().split(/\s+/).map(Number)
    : []

  const postgresResult = spawnSync(
    'psql',
    ['-h', '127.0.0.1', '-p', '55322', '-U', 'postgres', '-d', 'postgres', '-Atq', '-F', '|', '-c', [
      'SELECT',
      "count(*) FILTER (WHERE datname = current_database()),",
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
    observedAt,
    next: processValues.length === 2
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

function summarizeResources(samples) {
  const numeric = (selector) => samples.map(selector).filter(Number.isFinite)
  const maximum = (values) => values.length ? Math.max(...values) : null
  return {
    intervalMs: RESOURCE_INTERVAL_MS,
    samples: samples.length,
    next: {
      maxCpuPercent: maximum(numeric((sample) => sample.next?.cpuPercent)),
      maxRssBytes: maximum(numeric((sample) => sample.next?.rssBytes)),
    },
    postgres: {
      maxConnections: maximum(numeric((sample) => sample.postgres?.connections)),
      maxActiveConnections: maximum(numeric((sample) => sample.postgres?.activeConnections)),
      maxLockWaits: maximum(numeric((sample) => sample.postgres?.lockWaits)),
      maxQueriesOverOneSecond: maximum(numeric((sample) => sample.postgres?.queriesOverOneSecond)),
    },
    unmeasured: ['PostgreSQL/PostgREST/Kong CPU and memory'],
  }
}

function runLoadChild(env) {
  return new Promise((resolve, reject) => {
    let artifactPath = null
    loadProcess = spawn(
      process.execPath,
      ['scripts/performance/run-targeted-load.mjs', ...args],
      { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    createInterface({ input: loadProcess.stdout }).on('line', (line) => {
      try {
        const parsed = JSON.parse(line)
        if (typeof parsed.artifactPath === 'string') artifactPath = parsed.artifactPath
        process.stdout.write(`${JSON.stringify(sanitizeLoadRecord(parsed))}\n`)
      } catch {
        process.stdout.write(`${redactE2eOutput(line)}\n`)
      }
    })
    createInterface({ input: loadProcess.stderr }).on('line', (line) => {
      process.stderr.write(`${redactE2eOutput(line)}\n`)
    })
    loadProcess.once('error', reject)
    loadProcess.once('exit', (code) => resolve({ code, artifactPath }))
  })
}

function signalHandler(signal) {
  interruptedSignal = signal
  terminateProcessGroup(loadProcess, signal)
}
const handleSigint = () => signalHandler('SIGINT')
const handleSigterm = () => signalHandler('SIGTERM')
process.once('SIGINT', handleSigint)
process.once('SIGTERM', handleSigterm)

const resourceSampler = createBoundedResourceSampler({ sample: sampleLocalResources })
let runError = null
try {
  if (await isPortOpen(APP_PORT)) throw new Error('TARGETED_LOAD_OBSERVABILITY_PORT_IN_USE')
  rmSync(BUILD_DIR, { recursive: true, force: true })
  const env = childEnvironment()
  runBuild(env)
  serverProcess = spawn(
    './node_modules/.bin/next',
    ['start', '--hostname', '127.0.0.1', '--port', String(APP_PORT)],
    { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  collectServerStream(serverProcess.stdout)
  collectServerStream(serverProcess.stderr)
  await waitUntilReady()
  if (interruptedSignal) throw new Error('TARGETED_LOAD_OBSERVABILITY_INTERRUPTED')

  await resourceSampler.start()
  const childResult = await runLoadChild(env)
  await new Promise((resolve) => setTimeout(resolve, 100))
  if (!childResult.artifactPath || !existsSync(childResult.artifactPath)) {
    throw new Error('TARGETED_LOAD_ARTIFACT_NOT_FOUND')
  }

  const report = JSON.parse(readFileSync(childResult.artifactPath, 'utf8'))
  const correlation = correlateTargetedLoadSamples(report.samples ?? [], serverCollector.snapshot())
  const resourceSamples = resourceSampler.snapshot()
  const enhancedReport = sanitizeLoadRecord({
    ...report,
    observability: {
      localCollector: true,
      server: correlation,
      resources: {
        summary: summarizeResources(resourceSamples),
        samples: resourceSamples,
      },
    },
  })
  writeFileSync(childResult.artifactPath, `${JSON.stringify(enhancedReport, null, 2)}\n`, { mode: 0o600 })

  if (childResult.code !== 0) throw new Error('TARGETED_LOAD_CHILD_FAILED')
  if (!correlation.complete) throw new Error('TARGETED_LOAD_SERVER_CORRELATION_INCOMPLETE')
  process.stdout.write(`${JSON.stringify(sanitizeLoadRecord({
    outcome: 'MEASURED_WITH_SERVER_CORRELATION',
    mode: report.mode,
    artifactPath: childResult.artifactPath,
    server: correlation.server,
    client: correlation.client,
    overhead: correlation.overhead,
    correlated: correlation.correlated,
  }))}\n`)
} catch (error) {
  runError = error
  process.stderr.write(`${redactE2eOutput(error.message || 'TARGETED_LOAD_OBSERVABILITY_FAILED')}\n`)
} finally {
  await resourceSampler.stop()
  serverCollector.stop()
  await stopProcess(loadProcess)
  await stopProcess(serverProcess)
  rmSync(BUILD_DIR, { recursive: true, force: true })
  writeFileSync('tsconfig.json', originalTsconfig)
  process.removeListener('SIGINT', handleSigint)
  process.removeListener('SIGTERM', handleSigterm)
  if (await isPortOpen(APP_PORT)) {
    runError = new Error('TARGETED_LOAD_OBSERVABILITY_PORT_RESIDUE')
  }
}

if (runError) process.exitCode = interruptedSignal ? 130 : 1
