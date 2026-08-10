const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

export const TARGETED_LOAD_ROUTE = '/api/feedback/mine'
export const TARGETED_LOAD_METHOD = 'GET'
export const TARGETED_LOAD_TIMEOUT_MS = 5_000
export const TARGETED_LOAD_RETRIES = 0
export const TARGETED_LOAD_MAX_CONCURRENCY = 5
export const TARGETED_LOAD_MAX_RPS = 5
export const TARGETED_LOAD_MAX_DURATION_SECONDS = 300

export const TARGETED_LOAD_PROFILE = Object.freeze([
  Object.freeze({ name: 'warm-up', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 }),
  Object.freeze({ name: 'low', durationSeconds: 60, startVus: 2, endVus: 2, startRps: 2, endRps: 2 }),
  Object.freeze({ name: 'ramp', durationSeconds: 60, startVus: 2, endVus: 5, startRps: 2, endRps: 5 }),
  Object.freeze({ name: 'plateau', durationSeconds: 120, startVus: 5, endVus: 5, startRps: 5, endRps: 5 }),
  Object.freeze({ name: 'cooldown', durationSeconds: 30, startVus: 1, endVus: 1, startRps: 1, endRps: 1 }),
])

// Contract-only smoke: two local reads, never a substitute for the full proof.
export const TARGETED_LOAD_SMOKE_PROFILE = Object.freeze([
  Object.freeze({ name: 'smoke', durationSeconds: 2, startVus: 1, endVus: 1, startRps: 1, endRps: 1 }),
])

function configurationError(code) {
  return new Error(code)
}

export function assertLocalUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw configurationError(`${label}_INVALID_URL`)
  }
  if (!['http:', 'https:'].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    throw configurationError(`${label}_DISTANT_URL_REFUSED`)
  }
  if (url.username || url.password) throw configurationError(`${label}_CREDENTIALS_IN_URL_REFUSED`)
  return url
}

function assertOptionalLocalUrl(value, label) {
  if (!value) return
  assertLocalUrl(value, label)
}

export function assertSafeEnvironment(env) {
  if (String(env.VERCEL_ENV || '').toLowerCase() === 'production') throw configurationError('PRODUCTION_ENVIRONMENT_REFUSED')
  if (env.SUPABASE_PROJECT_REF) throw configurationError('SUPABASE_PROJECT_REF_REFUSED')
  if (env.SUPABASE_ACCESS_TOKEN) throw configurationError('SUPABASE_ACCESS_TOKEN_REFUSED')

  assertOptionalLocalUrl(env.API_URL, 'API_URL')
  assertOptionalLocalUrl(env.SUPABASE_URL, 'SUPABASE_URL_ENV')
  assertOptionalLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
  assertOptionalLocalUrl(env.SUPABASE_DB_URL, 'SUPABASE_DB_URL')
  assertOptionalLocalUrl(env.SEEDANCE_REFERENCE_SUPABASE_URL, 'SEEDANCE_REFERENCE_SUPABASE_URL')
  if (env.SEEDANCE_REFERENCE_SUPABASE_SERVICE_ROLE_KEY) {
    throw configurationError('SEEDANCE_REFERENCE_SERVICE_ROLE_REFUSED')
  }

  if (/^(?:sk|pk|rk)_live_/i.test(env.STRIPE_SECRET_KEY || '')
    || /^(?:sk|pk|rk)_live_/i.test(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')) {
    throw configurationError('STRIPE_LIVE_REFUSED')
  }
  if (/^sk-ant-/i.test(env.ANTHROPIC_API_KEY || '')) throw configurationError('ANTHROPIC_REAL_REFUSED')
  if (env.VAPID_PRIVATE_KEY) throw configurationError('PUSH_REAL_REFUSED')
  if (env.SMTP_HOST && !LOCAL_HOSTS.has(env.SMTP_HOST)) throw configurationError('SMTP_DISTANT_REFUSED')
  if (env.SMTP_URL) assertLocalUrl(env.SMTP_URL, 'SMTP_URL')
}

export function validateTargetedLoadProfile(profile) {
  if (!Array.isArray(profile) || profile.length === 0) throw configurationError('LOAD_PROFILE_REQUIRED')
  let totalDurationSeconds = 0
  for (const phase of profile) {
    for (const key of ['durationSeconds', 'startVus', 'endVus', 'startRps', 'endRps']) {
      if (!Number.isFinite(phase[key]) || phase[key] <= 0) throw configurationError(`INVALID_PROFILE_${key.toUpperCase()}`)
    }
    if (phase.startVus > TARGETED_LOAD_MAX_CONCURRENCY || phase.endVus > TARGETED_LOAD_MAX_CONCURRENCY) {
      throw configurationError('LOAD_CONCURRENCY_LIMIT_EXCEEDED')
    }
    if (phase.startRps > TARGETED_LOAD_MAX_RPS || phase.endRps > TARGETED_LOAD_MAX_RPS) {
      throw configurationError('LOAD_RATE_LIMIT_EXCEEDED')
    }
    totalDurationSeconds += phase.durationSeconds
  }
  if (totalDurationSeconds > TARGETED_LOAD_MAX_DURATION_SECONDS) {
    throw configurationError('LOAD_DURATION_LIMIT_EXCEEDED')
  }
  return { totalDurationSeconds }
}

export function assertTargetedLoadContract(options) {
  const appUrl = assertLocalUrl(options.appUrl, 'APP_URL')
  const supabaseUrl = assertLocalUrl(options.supabaseUrl, 'SUPABASE_URL')
  assertSafeEnvironment(options.env || {})
  if (options.route !== TARGETED_LOAD_ROUTE) throw configurationError('LOAD_ROUTE_NOT_ALLOWLISTED')
  if (options.method !== TARGETED_LOAD_METHOD) throw configurationError('LOAD_METHOD_NOT_ALLOWED')
  if (options.timeoutMs !== TARGETED_LOAD_TIMEOUT_MS) throw configurationError('LOAD_TIMEOUT_MUST_BE_5000_MS')
  if (options.retries !== TARGETED_LOAD_RETRIES) throw configurationError('LOAD_RETRIES_MUST_BE_ZERO')
  validateTargetedLoadProfile(options.profile)
  return { appUrl, supabaseUrl }
}

export function assertPreviousCleanupConfirmed(state) {
  if (state === null || state === undefined) return
  if (typeof state !== 'object' || state.cleanupConfirmed !== true) {
    throw configurationError('PREVIOUS_LOAD_CLEANUP_UNCONFIRMED')
  }
}

export function assertSafeRedirect(origin, location) {
  if (!location) throw configurationError('LOAD_REDIRECT_WITHOUT_LOCATION')
  const redirect = new URL(location, origin)
  if (redirect.origin !== new URL(origin).origin) throw configurationError('DISTANT_REDIRECT_REFUSED')
  throw configurationError('UNEXPECTED_LOAD_REDIRECT')
}

const SENSITIVE_KEY = /authorization|cookie|password|secret|service.?role|token|jwt|api.?key|private.?key/i
const SENSITIVE_VALUE = /(?:Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:sk|pk|rk)_(?:live|test)_\S+|sk-ant-\S+)/gi

export function sanitizeLoadRecord(value) {
  if (Array.isArray(value)) return value.map(sanitizeLoadRecord)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeLoadRecord(item),
    ]))
  }
  if (typeof value === 'string') return value.replace(SENSITIVE_VALUE, '[REDACTED]')
  return value
}

export function percentile(values, requestedPercentile) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.max(0, Math.ceil((requestedPercentile / 100) * sorted.length) - 1)
  return Number(sorted[rank].toFixed(2))
}

export function summarizeLoadPhase({ phase, samples, elapsedMs, maxConcurrency }) {
  const durations = samples.filter(sample => sample.completed).map(sample => sample.durationMs)
  const statusCount = predicate => samples.filter(sample => predicate(sample.status)).length
  return {
    phase: phase.name,
    attempted: samples.length,
    completed: durations.length,
    requestedRps: { start: phase.startRps, end: phase.endRps },
    achievedRps: Number((durations.length / Math.max(elapsedMs / 1_000, 0.001)).toFixed(2)),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    status2xx: statusCount(status => status >= 200 && status < 300),
    status4xx: statusCount(status => status >= 400 && status < 500),
    status5xx: statusCount(status => status >= 500 && status < 600),
    status429: statusCount(status => status === 429),
    timeouts: samples.filter(sample => sample.timeout).length,
    networkErrors: samples.filter(sample => sample.networkError !== null).length,
    maxConcurrency,
  }
}
