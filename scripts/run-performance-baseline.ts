import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { config as loadEnv } from 'dotenv'
import { analyzeProductionBundles } from './performance-baseline-bundle.ts'
import { stableJson } from '../lib/performance/baseline.ts'
import { assertLocalE2eUrl, assertTemporaryPortsClosed, redactE2eOutput } from './e2e-local-contract.mjs'

const BUILD_DIR = '.next-performance-baseline'
const APP_URL = 'http://127.0.0.1:3211'
const rawPath = resolve('/tmp/moovx-performance-baseline-raw.json')
const diagnosticMatrixPath = process.env.MOOVX_INP_DIAGNOSTIC_MATRIX_PATH
  ? resolve(process.env.MOOVX_INP_DIAGNOSTIC_MATRIX_PATH)
  : null
const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const outputPath = resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'perf/baseline/phase-8-baseline.json')
if (outputIndex >= 0 && !args[outputIndex + 1]) throw new Error('--output requires a path')

assertLocalE2eUrl(APP_URL, 'performance application URL')
const originalTsconfig = readFileSync('tsconfig.json', 'utf8')
const children: ChildProcess[] = []

function run(command: string, commandArgs: string[], env = process.env) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env })
  if (result.status !== 0) throw new Error(`${command} failed`)
}

function start(command: string, commandArgs: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, commandArgs, { detached: true, env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  for (const stream of [child.stdout, child.stderr]) if (stream) createInterface({ input: stream }).on('line', line => process.stdout.write(`${redactE2eOutput(line)}\n`))
  return child
}

async function ready(url: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(url)).ok) return } catch { /* retry bounded local readiness */ }
    await new Promise(resolveReady => setTimeout(resolveReady, 500))
  }
  throw new Error(`Local production server unavailable: ${new URL(url).origin}`)
}

async function assertMailpitEmpty() {
  const response = await fetch('http://127.0.0.1:55324/api/v1/messages')
  const payload = await response.json() as unknown
  const count = Array.isArray(payload) ? payload.length : typeof payload === 'object' && payload !== null && 'messages' in payload && Array.isArray(payload.messages) ? payload.messages.length : 0
  if (count) throw new Error('Mailpit must be empty before and after the performance baseline')
}

function enrichHeavyLibraryEvidence(evidencePath: string) {
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as Record<string, unknown>
  const groups = ['recharts', 'xlsx', 'qr', 'mediapipe'] as const
  const chunkGroups = Object.fromEntries(groups.map(group => {
    const value = evidence[group]
    const paths = typeof value === 'object' && value !== null && 'first' in value && Array.isArray(value.first)
      ? value.first.filter((path): path is string => typeof path === 'string')
      : []
    const files = paths.map(path => {
      if (!path.startsWith('/_next/')) throw new Error(`Unexpected heavy-library chunk path: ${path}`)
      const file = path.slice('/_next/'.length)
      const bytes = readFileSync(resolve(BUILD_DIR, file))
      return { file, rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength }
    })
    return [group, {
      files,
      totals: files.reduce((total, file) => ({
        rawBytes: total.rawBytes + file.rawBytes,
        gzipBytes: total.gzipBytes + file.gzipBytes,
      }), { rawBytes: 0, gzipBytes: 0 }),
    }]
  }))
  writeFileSync(evidencePath, stableJson({ ...evidence, chunkGroups }))
}

let completed = false
try {
  run(process.execPath, ['scripts/supabase-local.mjs', 'ensure'])
  loadEnv({ path: '.env.e2e.local', quiet: true, override: true })
  if (!process.env.ANON_KEY || !process.env.SERVICE_ROLE_KEY) throw new Error('Local Supabase keys are unavailable')
  await assertMailpitEmpty()
  rmSync(BUILD_DIR, { recursive: true, force: true })
  rmSync(rawPath, { force: true })
  const env = {
    ...process.env,
    MOOVX_E2E: '1',
    MOOVX_BUILD_DIR: BUILD_DIR,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: APP_URL,
    NEXT_PUBLIC_SITE_URL: APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY,
    MOOVX_E2E_APP_URL: APP_URL,
    MOOVX_BASELINE_RAW_PATH: rawPath,
    TZ: 'Europe/Zurich',
  }
  run(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], env)
  for (const required of ['BUILD_ID', 'build-manifest.json', 'routes-manifest.json', 'prerender-manifest.json', 'server/app-paths-manifest.json']) {
    if (!existsSync(`${BUILD_DIR}/${required}`)) throw new Error(`Incomplete production build: ${required}`)
  }
  start('./node_modules/.bin/next', ['start', '--hostname', '127.0.0.1', '--port', '3211'], env)
  await ready(APP_URL)
  if (diagnosticMatrixPath) {
    const experiments: Record<string, unknown> = {}
    for (const experiment of [
      { name: 'normal-cold', requestMode: 'normal', cacheState: 'cold' },
      { name: 'blocked-cold', requestMode: 'block', cacheState: 'cold' },
      { name: 'normal-hot', requestMode: 'normal', cacheState: 'hot' },
    ]) {
      run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-baseline.spec.ts'], {
        ...env,
        MOOVX_PERFORMANCE_DIAGNOSTICS: '1',
        MOOVX_POSTER_REQUEST_MODE: experiment.requestMode,
        MOOVX_POSTER_CACHE_STATE: experiment.cacheState,
      })
      experiments[experiment.name] = JSON.parse(readFileSync(rawPath, 'utf8')) as unknown
    }
    const normalCold = experiments['normal-cold']
    if (!normalCold || typeof normalCold !== 'object') throw new Error('Normal cold diagnostic is unavailable')
    writeFileSync(rawPath, stableJson(normalCold), { mode: 0o600 })
    mkdirSync(dirname(diagnosticMatrixPath), { recursive: true })
    writeFileSync(diagnosticMatrixPath, stableJson({
      schemaVersion: 1,
      buildId: readFileSync(`${BUILD_DIR}/BUILD_ID`, 'utf8').trim(),
      experiments,
    }), { mode: 0o600 })
  } else {
    run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-baseline.spec.ts'], env)
  }
  if (process.env.MOOVX_LAZY_UI_EVIDENCE_PATH) {
    run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-lazy-secondary-ui.spec.ts'], env)
  }
  if (process.env.MOOVX_HEAVY_UI_EVIDENCE_PATH) {
    run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-heavy-libraries.spec.ts'], env)
    enrichHeavyLibraryEvidence(process.env.MOOVX_HEAVY_UI_EVIDENCE_PATH)
  }
  if (process.env.MOOVX_VIDEO_EVIDENCE_PATH) {
    run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-video-delivery.spec.ts'], env)
  }
  if (process.env.MOOVX_FONT_EVIDENCE_PATH) {
    run('./node_modules/.bin/playwright', ['test', '--workers=1', 'e2e/performance-font-loading.spec.ts'], env)
  }
  if (!existsSync(rawPath)) throw new Error('Playwright did not produce raw baseline measurements')

  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> }
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
  const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim()
  const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as Record<string, unknown>
  const artifact = {
    schemaVersion: 1,
    environment: {
      measuredAt: new Date().toISOString(), commit,
      buildId: readFileSync(`${BUILD_DIR}/BUILD_ID`, 'utf8').trim(),
      node: process.version, npm: npmVersion,
      next: packageJson.dependencies.next,
      playwright: packageJson.devDependencies['@playwright/test'],
      browser: raw.browser,
      timezone: 'Europe/Zurich',
      viewports: { clientMobile: { width: 390, height: 844 }, coachDesktop: { width: 1440, height: 900 } },
      network: 'localhost-only; external browser requests aborted and asserted absent',
    },
    bundle: analyzeProductionBundles(BUILD_DIR),
    ...(process.env.MOOVX_PERFORMANCE_DIAGNOSTICS === '1' || diagnosticMatrixPath
      ? { diagnosticProtocol: raw.diagnosticProtocol }
      : {}),
    journeys: raw.journeys,
  }
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, stableJson(artifact))
  completed = true
} finally {
  for (const child of children.reverse()) { try { if (child.pid) process.kill(-child.pid, 'SIGTERM') } catch { /* already stopped */ } }
  await new Promise(resolveCleanup => setTimeout(resolveCleanup, 500))
  for (const child of children) { try { if (child.pid) process.kill(-child.pid, 'SIGKILL') } catch { /* already stopped */ } }
  writeFileSync('tsconfig.json', originalTsconfig)
  rmSync(rawPath, { force: true })
  rmSync(BUILD_DIR, { recursive: true, force: true })
  await assertTemporaryPortsClosed([3211])
  await assertMailpitEmpty()
}

if (!completed) process.exitCode = 1
