import net from 'node:net'
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

export const E2E_TEMPORARY_PORTS = [3210, 55326, 55328, 55329, 55330]

export const CRITICAL_E2E_TARGET_MATRIX = Object.freeze([
  { name: 'Invitation coach', spec: 'e2e/coach-invitation.spec.ts', flags: [], integrated: true },
  { name: 'Checkout plateforme', spec: 'e2e/platform-checkout.spec.ts', flags: ['--stripe'], integrated: true },
  { name: 'Checkout coach', spec: 'e2e/coach-checkout.spec.ts', flags: ['--stripe'], integrated: true },
  { name: 'Notification Push', spec: 'e2e/push-notification.spec.ts', flags: ['--push'], integrated: true },
  { name: 'Chat Athena', spec: 'e2e/chat-ai.spec.ts', flags: ['--anthropic'], integrated: true },
  { name: 'Inscription, authentification et reprise de session', spec: 'e2e/auth-registration-flow.spec.ts', flags: [], integrated: true },
  { name: 'Parcours client rattaché à un coach', spec: 'e2e/coach-client-client.spec.ts', flags: [], integrated: true },
  { name: 'Parcours coach gérant un client', spec: 'e2e/coach-client-coach.spec.ts', flags: [], integrated: true },
  { name: 'Attribution du coach par défaut', spec: 'e2e/default-coach-assignment.spec.ts', flags: [], integrated: true },
  { name: 'Webhook Platform signé, rejeu et idempotence', spec: 'e2e/platform-webhook-runtime.spec.ts', flags: ['--stripe'], integrated: true },
  { name: 'Cycle d’une séance Training', spec: 'e2e/training-workout-cycle.spec.ts', flags: [], integrated: true },
  { name: 'Journal nutritionnel quotidien', spec: null, flags: [], integrated: false },
  { name: 'Suivi de progression', spec: null, flags: [], integrated: false },
  { name: 'Messagerie coach-client et synchronisation Realtime', spec: null, flags: [], integrated: false },
  { name: 'Réconciliation abonnement et Billing', spec: null, flags: [], integrated: false },
])

export function validateCriticalE2eTargetMatrix(matrix = CRITICAL_E2E_TARGET_MATRIX) {
  if (matrix.length !== 15) throw new Error(`Critical E2E target matrix must contain exactly 15 journeys, received ${matrix.length}`)
  const names = new Set(matrix.map(journey => journey.name))
  if (names.size !== matrix.length) throw new Error('Critical E2E target matrix contains duplicate journey names')
  const integrated = matrix.filter(journey => journey.integrated)
  if (integrated.some(journey => !journey.spec)) throw new Error('Every integrated critical E2E journey must reference a spec')
  return matrix
}

export function getIntegratedCriticalE2eScenarios(matrix = CRITICAL_E2E_TARGET_MATRIX) {
  return validateCriticalE2eTargetMatrix(matrix).filter(journey => journey.integrated)
}

export function acquireE2eLock(lockPath, label = 'E2E suite', pid = process.pid) {
  try {
    const fd = openSync(lockPath, 'wx', 0o600)
    writeFileSync(fd, `${pid}\n`)
    closeSync(fd)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const owner = readFileSync(lockPath, 'utf8').trim() || 'unknown'
    throw new Error(`Another ${label} is already running (pid ${owner})`)
  }
  return () => { try { unlinkSync(lockPath) } catch (error) { if (error.code !== 'ENOENT') throw error } }
}

export function assertLocalE2eUrl(value, label = 'E2E URL') {
  const url = new URL(value)
  if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(`Refusing non-local ${label}: ${url.origin}`)
  return url
}

export function assertOnlyConfiguredLocalOrigins(observedOrigins, configuredUrls) {
  const configured = configuredUrls.map((value, index) => assertLocalE2eUrl(value, `configured E2E URL ${index + 1}`))
  const allowedBoundaries = new Set(configured.map(url => `${url.protocol}//${url.port || (url.protocol === 'https:' ? '443' : '80')}`))
  for (const origin of observedOrigins) {
    const url = assertLocalE2eUrl(origin, 'observed browser origin')
    const boundary = `${url.protocol}//${url.port || (url.protocol === 'https:' ? '443' : '80')}`
    if (!allowedBoundaries.has(boundary)) throw new Error(`Refusing unconfigured local E2E origin: ${url.origin}`)
  }
}

export function assertLocalSupabaseConfig(config) {
  const activeConfig = config.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n')
  const urls = activeConfig.match(/https?:\/\/[^"\s,\]]+/g) || []
  if (urls.some(value => !LOCAL_HOSTS.has(new URL(value).hostname))) throw new Error('Refusing non-local URL in Supabase config')
  const requiredValues = ['port = 55321', 'port = 55322', 'port = 55324', 'smtp_port = 55325', 'site_url = "http://127.0.0.1:3000"']
  for (const value of requiredValues) if (!activeConfig.includes(value)) throw new Error(`Missing required local config: ${value}`)
  const redirects = activeConfig.split('\n').find(line => line.trimStart().startsWith('additional_redirect_urls =')) || ''
  for (const value of ['"http://127.0.0.1:3210/auth/callback"', '"http://127.0.0.1:3210/join"']) {
    if (!redirects.includes(value)) throw new Error(`Missing required local E2E redirect: ${value}`)
  }
}

export function redactE2eOutput(value) {
  return String(value)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/[A-Za-z0-9_-]{43}/g, '[REDACTED_TOKEN]')
    .replace(/(authorization|cookie|set-cookie|service[_-]?role[_-]?key|anon[_-]?key|api[_-]?key|private[_-]?key|invitation[_-]?token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/("(?:system|prompt|messages|profile|payload)"\s*:\s*)("(?:\\.|[^"\\])*"|\[[\s\S]*?\]|\{[\s\S]*?\})/gi, '$1"[REDACTED]"')
}

export async function isPortOpen(port, host = '127.0.0.1', timeoutMs = 350) {
  return await new Promise(resolve => {
    const socket = net.createConnection({ port, host })
    const finish = open => { socket.destroy(); resolve(open) }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

export async function assertTemporaryPortsClosed(ports = E2E_TEMPORARY_PORTS) {
  const states = await Promise.all(ports.map(async port => [port, await isPortOpen(port)]))
  const open = states.filter(([, active]) => active).map(([port]) => port)
  if (open.length) throw new Error(`Temporary E2E ports still open: ${open.join(', ')}`)
}
