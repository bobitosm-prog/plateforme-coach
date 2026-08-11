import { percentile, sanitizeLoadRecord } from './targeted-load-contract.mjs'

const OBSERVED_EVENT = 'FEEDBACK_READ_REQUEST'
const OBSERVED_OPERATION = 'GET /api/feedback/mine'
const REQUEST_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{7,63}$/

function round(value) {
  return Number(value.toFixed(2))
}

function parseJsonObject(line) {
  if (typeof line !== 'string') return null

  const start = line.indexOf('{')
  const end = line.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    const parsed = JSON.parse(line.slice(start, end + 1))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null
  } catch {
    return null
  }
}

export function parseTargetedLoadServerEvent(line) {
  const record = parseJsonObject(line)
  if (!record) return null
  if (record.event !== OBSERVED_EVENT || record.operation !== OBSERVED_OPERATION) {
    return null
  }
  if (!REQUEST_ID_PATTERN.test(record.request_id ?? '')) return null
  if (!Number.isFinite(record.duration_ms) || record.duration_ms < 0) return null
  if (!Number.isInteger(record.status) || record.status < 100 || record.status > 599) {
    return null
  }

  // Deliberately copy only the correlation fields used by the report. The
  // route context and every unknown field are discarded rather than redacted
  // after persistence.
  return sanitizeLoadRecord({
    timestamp: String(record.timestamp ?? ''),
    event: OBSERVED_EVENT,
    operation: OBSERVED_OPERATION,
    outcome: String(record.outcome ?? ''),
    requestId: record.request_id,
    durationMs: record.duration_ms,
    status: record.status,
  })
}

export function createTargetedLoadServerCollector({ maxEvents = 2_000 } = {}) {
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > 10_000) {
    throw new Error('TARGETED_LOAD_COLLECTOR_BOUND_INVALID')
  }

  let active = true
  const events = []

  return {
    ingest(line) {
      if (!active) return false
      const event = parseTargetedLoadServerEvent(line)
      if (!event) return false
      if (events.length >= maxEvents) {
        throw new Error('TARGETED_LOAD_SERVER_EVENT_LIMIT_EXCEEDED')
      }
      events.push(event)
      return true
    },
    snapshot() {
      return events.map((event) => ({ ...event }))
    },
    stop() {
      active = false
    },
    isActive() {
      return active
    },
  }
}

function summarize(values) {
  return {
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99),
  }
}

export function correlateTargetedLoadSamples(samples, serverEvents) {
  const byRequestId = new Map()
  for (const event of serverEvents) {
    if (byRequestId.has(event.requestId)) {
      throw new Error(`TARGETED_LOAD_DUPLICATE_SERVER_EVENT:${event.requestId}`)
    }
    byRequestId.set(event.requestId, event)
  }

  const correlated = []
  const missingRequestIds = []
  for (const sample of samples) {
    if (!sample.requestId) {
      missingRequestIds.push(null)
      continue
    }
    const event = byRequestId.get(sample.requestId)
    if (!event) {
      missingRequestIds.push(sample.requestId)
      continue
    }

    correlated.push({
      timestamp: sample.timestamp,
      phase: sample.phase,
      requestId: sample.requestId,
      status: sample.status,
      serverStatus: event.status,
      clientDurationMs: sample.durationMs,
      serverDurationMs: event.durationMs,
      overheadMs: round(sample.durationMs - event.durationMs),
    })
  }

  const phases = [...new Set(correlated.map((sample) => sample.phase))]
  const byPhase = Object.fromEntries(
    phases.map((phase) => {
      const phaseSamples = correlated.filter((sample) => sample.phase === phase)
      return [
        phase,
        {
          count: phaseSamples.length,
          client: summarize(phaseSamples.map((sample) => sample.clientDurationMs)),
          server: summarize(phaseSamples.map((sample) => sample.serverDurationMs)),
          overhead: summarize(phaseSamples.map((sample) => sample.overheadMs)),
        },
      ]
    }),
  )

  const topSlowest = [...correlated]
    .sort((left, right) => right.clientDurationMs - left.clientDurationMs)
    .slice(0, 10)

  return sanitizeLoadRecord({
    complete: missingRequestIds.length === 0 && correlated.length === samples.length,
    attempted: samples.length,
    correlated: correlated.length,
    missingRequestIds,
    client: summarize(correlated.map((sample) => sample.clientDurationMs)),
    server: summarize(correlated.map((sample) => sample.serverDurationMs)),
    overhead: summarize(correlated.map((sample) => sample.overheadMs)),
    byPhase,
    topSlowest,
  })
}

/**
 * @param {{
 *   sample: () => unknown | Promise<unknown>,
 *   intervalMs?: number,
 *   maxSamples?: number,
 *   setIntervalFn?: typeof setInterval,
 *   clearIntervalFn?: typeof clearInterval,
 * }} options
 */
export function createBoundedResourceSampler({
  sample,
  intervalMs = 5_000,
  maxSamples = 100,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  if (typeof sample !== 'function') throw new Error('RESOURCE_SAMPLER_CALLBACK_REQUIRED')
  if (!Number.isInteger(intervalMs) || intervalMs < 1_000 || intervalMs > 60_000) {
    throw new Error('RESOURCE_SAMPLER_INTERVAL_INVALID')
  }
  if (!Number.isInteger(maxSamples) || maxSamples < 1 || maxSamples > 1_000) {
    throw new Error('RESOURCE_SAMPLER_BOUND_INVALID')
  }

  let active = false
  let timer = null
  let inFlight = null
  const samples = []

  const capture = async () => {
    if (!active || inFlight || samples.length >= maxSamples) return
    inFlight = Promise.resolve(sample())
      .then((value) => {
        if (active && value && samples.length < maxSamples) {
          samples.push(sanitizeLoadRecord(value))
        }
      })
      .finally(() => {
        inFlight = null
      })
    await inFlight
  }

  return {
    async start() {
      if (active) return
      active = true
      await capture()
      timer = setIntervalFn(() => void capture(), intervalMs)
    },
    async stop() {
      active = false
      if (timer !== null) clearIntervalFn(timer)
      timer = null
      if (inFlight) await inFlight
    },
    snapshot() {
      return samples.map((value) => ({ ...value }))
    },
    isActive() {
      return active
    },
  }
}
