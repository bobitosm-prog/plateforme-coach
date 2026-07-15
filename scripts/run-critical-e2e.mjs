import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { acquireE2eLock, assertLocalE2eUrl, assertTemporaryPortsClosed, redactE2eOutput } from './e2e-local-contract.mjs'
import { assertNoRemoteProject, LOCAL_MAILPIT_URL } from './supabase-local-contract.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const lockPath = resolve(root, '.critical-e2e.lock')
const artifactsPath = resolve(root, 'test-results/critical-e2e')
const scenarios = [
  { name: 'Invitation coach vérifiée', spec: 'e2e/coach-invitation.spec.ts', flags: [] },
  { name: 'Checkout plateforme', spec: 'e2e/platform-checkout.spec.ts', flags: ['--stripe'] },
  { name: 'Checkout coach', spec: 'e2e/coach-checkout.spec.ts', flags: ['--stripe'] },
  { name: 'Notification push', spec: 'e2e/push-notification.spec.ts', flags: ['--push'] },
  { name: 'Chat Athena', spec: 'e2e/chat-ai.spec.ts', flags: ['--anthropic'] },
]

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
    env: options.env || process.env,
  })
  const output = redactE2eOutput(`${result.stdout || ''}${result.stderr || ''}`)
  if (result.error) throw new Error(`${options.label || command}: ${result.error.message}`)
  if (result.status !== 0) {
    const error = new Error(`${options.label || command} failed with exit code ${result.status}`)
    error.output = output
    throw error
  }
  return output
}

function classifyFailure(output) {
  if (/test timeout|expect\(.+\)\.to|\d+ failed/i.test(output)) return 'fonctionnel'
  if (/cleanup|residu|still open|synthetic|mailpit/i.test(output)) return 'nettoyage incomplet'
  if (/docker|supabase|eaddrinuse|econnrefused|local service unavailable|browser.*missing|infrastructure/i.test(output)) return 'infrastructure'
  return 'fonctionnel'
}

async function countRows(admin, table) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`Final cleanup audit failed for ${table}: ${error.message}`)
  return count || 0
}

async function auditFinalState() {
  loadEnv({ path: resolve(root, '.env.e2e.local'), quiet: true, override: true })
  const url = process.env.API_URL || ''
  const key = process.env.SERVICE_ROLE_KEY || ''
  assertLocalE2eUrl(url, 'Supabase URL')
  assertLocalE2eUrl(LOCAL_MAILPIT_URL, 'Mailpit URL')
  if (!key) throw new Error('Local service-role key unavailable for cleanup audit')
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw new Error(`Final Auth cleanup audit failed: ${usersError.message}`)
  const syntheticUsers = users.users.filter(user => /@(moovx\.)?example\.test$/i.test(user.email || ''))
  const tables = ['profiles', 'coach_clients', 'coach_invitations', 'payments', 'push_subscriptions', 'messages', 'chat_ai_messages', 'ai_usage_logs']
  const counts = Object.fromEntries(await Promise.all(tables.map(async table => [table, await countRows(admin, table)])))
  const response = await fetch(`${LOCAL_MAILPIT_URL}/api/v1/messages`)
  if (!response.ok) throw new Error(`Mailpit cleanup audit failed with HTTP ${response.status}`)
  const mailbox = await response.json()
  const mailCount = Array.isArray(mailbox) ? mailbox.length : (mailbox.messages?.length || mailbox.total || 0)
  await assertTemporaryPortsClosed()

  const residual = [
    ...(syntheticUsers.length ? [`auth=${syntheticUsers.length}`] : []),
    ...Object.entries(counts).filter(([, count]) => count !== 0).map(([table, count]) => `${table}=${count}`),
    ...(mailCount ? [`mailpit=${mailCount}`] : []),
  ]
  if (residual.length) throw new Error(`Synthetic cleanup incomplete: ${residual.join(', ')}`)
}

const releaseLock = acquireE2eLock(lockPath, 'critical E2E suite')
const started = performance.now()
const results = []
let suiteFailed = false

try {
  assertNoRemoteProject()
  for (const value of ['http://127.0.0.1:3210', 'http://127.0.0.1:55321', LOCAL_MAILPIT_URL, 'http://127.0.0.1:55326', 'https://127.0.0.1:55328', 'http://127.0.0.1:55329', 'http://127.0.0.1:55330']) {
    assertLocalE2eUrl(value)
  }
  rmSync(artifactsPath, { recursive: true, force: true })
  mkdirSync(artifactsPath, { recursive: true })
  run('docker', ['info', '--format', '{{.ServerVersion}}'], { label: 'Docker check' })
  run(process.execPath, ['scripts/supabase-local.mjs', 'reset'], { label: 'Canonical Supabase reset' })
  run(process.execPath, ['scripts/supabase-local.mjs', 'verify'], { label: 'Migration contract verification' })

  for (const scenario of scenarios) {
    const scenarioStarted = performance.now()
    const scenarioArtifacts = resolve(artifactsPath, scenario.spec.replace(/^e2e\//, '').replace(/\.spec\.ts$/, ''))
    try {
      run(process.execPath, ['scripts/run-local-e2e.mjs', scenario.spec, ...scenario.flags], {
        label: scenario.name,
        env: {
          ...process.env,
          MOOVX_CRITICAL_E2E: '1',
          MOOVX_E2E_RETAIN_FAILURE: '1',
          MOOVX_E2E_ARTIFACTS_DIR: scenarioArtifacts,
          HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '',
          NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost',
        },
      })
      await assertTemporaryPortsClosed()
      await auditFinalState()
      rmSync(scenarioArtifacts, { recursive: true, force: true })
      results.push({ ...scenario, status: 'VERT', duration: performance.now() - scenarioStarted })
    } catch (error) {
      suiteFailed = true
      const output = redactE2eOutput(error.output || error.stack || error.message)
      results.push({ ...scenario, status: 'ÉCHEC', kind: classifyFailure(output), duration: performance.now() - scenarioStarted, output })
    }
  }

  try {
    await auditFinalState()
  } catch (error) {
    suiteFailed = true
    results.push({ name: 'Audit global de nettoyage', status: 'ÉCHEC', kind: 'nettoyage incomplet', duration: 0, output: redactE2eOutput(error.stack || error.message) })
  }
} catch (error) {
  suiteFailed = true
  results.push({ name: 'Préparation de la suite', status: 'ÉCHEC', kind: 'infrastructure', duration: performance.now() - started, output: redactE2eOutput(error.stack || error.message) })
} finally {
  releaseLock()
}

console.log('\nSuite E2E critique MoovX')
for (const result of results) {
  console.log(`- ${result.name}: ${result.status} (${(result.duration / 1000).toFixed(1)} s)${result.kind ? ` — ${result.kind}` : ''}`)
  if (result.status === 'ÉCHEC') console.error(result.output)
}
console.log(`Durée totale: ${((performance.now() - started) / 1000).toFixed(1)} s`)
if (!suiteFailed) rmSync(artifactsPath, { recursive: true, force: true })
else console.error(`Traces d'échec conservées dans ${artifactsPath.replace(`${root}/`, '')}`)
process.exitCode = suiteFailed ? 1 : 0
