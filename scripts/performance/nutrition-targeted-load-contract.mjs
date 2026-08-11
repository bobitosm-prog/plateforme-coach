import {
  TARGETED_LOAD_MAX_CONCURRENCY,
  TARGETED_LOAD_MAX_DURATION_SECONDS,
  TARGETED_LOAD_MAX_RPS,
  TARGETED_LOAD_PROFILE,
  TARGETED_LOAD_RETRIES,
  TARGETED_LOAD_TIMEOUT_MS,
  assertLocalUrl,
  assertPreviousCleanupConfirmed,
  assertSafeEnvironment,
  percentile,
  sanitizeLoadRecord,
  validateTargetedLoadProfile,
} from './targeted-load-contract.mjs'

export {
  TARGETED_LOAD_MAX_CONCURRENCY as NUTRITION_LOAD_MAX_CONCURRENCY,
  TARGETED_LOAD_MAX_DURATION_SECONDS as NUTRITION_LOAD_MAX_DURATION_SECONDS,
  TARGETED_LOAD_MAX_RPS as NUTRITION_LOAD_MAX_RPS,
  TARGETED_LOAD_PROFILE as NUTRITION_LOAD_PROFILE,
  TARGETED_LOAD_RETRIES as NUTRITION_LOAD_RETRIES,
  TARGETED_LOAD_TIMEOUT_MS as NUTRITION_LOAD_TIMEOUT_MS,
  assertPreviousCleanupConfirmed,
  percentile,
  sanitizeLoadRecord,
}

export const NUTRITION_LOAD_TARGET = 'nutrition-journal-read-model'
export const NUTRITION_LOAD_OPERATION = 'READ'
export const NUTRITION_LOAD_CLIENTS = 5
export const NUTRITION_LOAD_DAYS = 31
export const NUTRITION_LOAD_LOGS_PER_DAY = 8
export const NUTRITION_LOAD_WATER_ROWS_PER_CLIENT = 8
export const NUTRITION_LOAD_SMOKE_REQUESTS = 1

export function assertNutritionLoadContract(options) {
  const supabaseUrl = assertLocalUrl(options.supabaseUrl, 'SUPABASE_URL')
  assertSafeEnvironment(options.env || {})
  if (options.target !== NUTRITION_LOAD_TARGET) throw new Error('NUTRITION_LOAD_TARGET_NOT_ALLOWLISTED')
  if (options.operation !== NUTRITION_LOAD_OPERATION) throw new Error('NUTRITION_LOAD_OPERATION_NOT_ALLOWED')
  if (options.timeoutMs !== TARGETED_LOAD_TIMEOUT_MS) throw new Error('NUTRITION_LOAD_TIMEOUT_MUST_BE_5000_MS')
  if (options.retries !== TARGETED_LOAD_RETRIES) throw new Error('NUTRITION_LOAD_RETRIES_MUST_BE_ZERO')
  validateTargetedLoadProfile(options.profile)
  return { supabaseUrl }
}

export function assertNutritionFixtureCardinality(input) {
  if (input.clients !== NUTRITION_LOAD_CLIENTS) throw new Error('NUTRITION_LOAD_CLIENT_COUNT_INVALID')
  if (input.logs !== NUTRITION_LOAD_CLIENTS * NUTRITION_LOAD_DAYS * NUTRITION_LOAD_LOGS_PER_DAY) {
    throw new Error('NUTRITION_LOAD_LOG_COUNT_INVALID')
  }
  if (input.water !== NUTRITION_LOAD_CLIENTS * NUTRITION_LOAD_WATER_ROWS_PER_CLIENT) {
    throw new Error('NUTRITION_LOAD_WATER_COUNT_INVALID')
  }
}

export function summarizeNutritionLoadPhase({ phase, samples, elapsedMs, maxConcurrency }) {
  const completed = samples.filter(sample => sample.completed)
  const durations = completed.map(sample => sample.metrics.total_ms)
  const metricSummary = key => ({
    p50Ms: percentile(completed.map(sample => sample.metrics[key]), 50),
    p95Ms: percentile(completed.map(sample => sample.metrics[key]), 95),
    p99Ms: percentile(completed.map(sample => sample.metrics[key]), 99),
  })
  return sanitizeLoadRecord({
    phase: phase.name,
    attempted: samples.length,
    completed: completed.length,
    requestedRps: { start: phase.startRps, end: phase.endRps },
    achievedRps: Number((completed.length / Math.max(elapsedMs / 1_000, 0.001)).toFixed(3)),
    total: {
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
    },
    journal: metricSummary('journal_ms'),
    calendar: metricSummary('calendar_ms'),
    water: metricSummary('water_ms'),
    aggregation: metricSummary('aggregation_ms'),
    errors: samples.filter(sample => !sample.completed).length,
    timeouts: samples.filter(sample => sample.timeout).length,
    maxConcurrency,
  })
}
