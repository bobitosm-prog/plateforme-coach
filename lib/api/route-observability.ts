import { resolveCorrelationId } from '@/lib/security/audit-log'

export type ApiRouteOutcome = 'success' | 'rejected' | 'failed' | 'skipped'
export type ApiRouteLogLevel = 'info' | 'warning' | 'error'

export interface ApiRouteDescriptor {
  event: string
  domain: string
  operation: string
}

export interface ApiRouteCompletion {
  outcome: ApiRouteOutcome
  reason: string
  context?: Record<string, string | number | boolean | null>
}

export interface ApiRouteLogRecord {
  timestamp: string
  level: ApiRouteLogLevel
  event: string
  domain: string
  operation: string
  outcome: ApiRouteOutcome
  reason: string
  status: number
  request_id: string
  duration_ms: number
  context: Record<string, string | number | boolean | null>
}

const SAFE_NAME_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/
const SAFE_DOMAIN_PATTERN = /^[a-z][a-z0-9_]{1,31}$/
const SAFE_OPERATION_PATTERN = /^(GET|POST|PUT|PATCH|DELETE) \/[A-Za-z0-9_./-]{1,100}$/
const SAFE_CONTEXT_STRING_PATTERN = /^[A-Za-z0-9_.:/ -]{1,64}$/
const BLOCKED_CONTEXT_KEY = /(authorization|body|cause|cookie|email|error|hash|key|message|path|payload|prompt|secret|session|signature|stack|subscription|token|url|vapid)/i
const BLOCKED_CONTEXT_VALUE = /(?:@|bearer\s|https?:\/\/|api[_-]?key|anthropic|cookie|password|secret|session|stripe|token|vapid)/i

function safeName(value: string, fallback: string): string {
  return SAFE_NAME_PATTERN.test(value) ? value : fallback
}

function safeContext(input: ApiRouteCompletion['context']): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(input ?? {}).slice(0, 12)) {
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key) || BLOCKED_CONTEXT_KEY.test(key)) continue
    if (typeof value === 'string') {
      if (!SAFE_CONTEXT_STRING_PATTERN.test(value) || BLOCKED_CONTEXT_VALUE.test(value)) continue
      output[key] = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      output[key] = Math.max(-1_000_000_000, Math.min(1_000_000_000, value))
    } else if (typeof value === 'boolean' || value === null) {
      output[key] = value
    }
  }
  return output
}

function levelFor(outcome: ApiRouteOutcome): ApiRouteLogLevel {
  if (outcome === 'failed') return 'error'
  if (outcome === 'rejected') return 'warning'
  return 'info'
}

export function writeApiRouteEvent(
  descriptor: ApiRouteDescriptor,
  completion: ApiRouteCompletion,
  options: {
    requestId: string
    status: number
    durationMs?: number
    timestamp?: string
    write?: (level: ApiRouteLogLevel, serialized: string) => void
  },
): void {
  const outcome = completion.outcome
  const level = levelFor(outcome)
  const record: ApiRouteLogRecord = {
    timestamp: options.timestamp ?? new Date().toISOString(),
    level,
    event: safeName(descriptor.event, 'API_REQUEST'),
    domain: SAFE_DOMAIN_PATTERN.test(descriptor.domain) ? descriptor.domain : 'api',
    operation: SAFE_OPERATION_PATTERN.test(descriptor.operation) ? descriptor.operation : 'GET /unknown',
    outcome,
    reason: safeName(completion.reason, 'UNKNOWN_REASON'),
    status: options.status,
    request_id: options.requestId,
    duration_ms: Math.min(86_400_000, Math.max(0, Math.round(options.durationMs ?? 0))),
    context: safeContext(completion.context),
  }
  const write = options.write ?? ((recordLevel: ApiRouteLogLevel, serialized: string) => {
    if (recordLevel === 'error') console.error(serialized)
    else if (recordLevel === 'warning') console.warn(serialized)
    else console.info(serialized)
  })
  write(level, JSON.stringify(record))
}

export function createApiRouteObservability(
  request: Request,
  descriptor: ApiRouteDescriptor,
  options: {
    now?: () => number
    timestamp?: () => string
    write?: (level: ApiRouteLogLevel, serialized: string) => void
  } = {},
) {
  const requestId = resolveCorrelationId(request)
  const now = options.now ?? Date.now
  const startedAt = now()
  let logged = false

  const event = safeName(descriptor.event, 'API_REQUEST')
  const domain = SAFE_DOMAIN_PATTERN.test(descriptor.domain) ? descriptor.domain : 'api'
  const operation = SAFE_OPERATION_PATTERN.test(descriptor.operation) ? descriptor.operation : 'GET /unknown'
  const write = options.write ?? ((level: ApiRouteLogLevel, serialized: string) => {
    if (level === 'error') console.error(serialized)
    else if (level === 'warning') console.warn(serialized)
    else console.info(serialized)
  })

  return {
    requestId,
    complete(response: Response, completion: ApiRouteCompletion): Response {
      response.headers.set('x-request-id', requestId)
      if (logged) return response
      logged = true
      writeApiRouteEvent({ event, domain, operation }, completion, {
        requestId,
        status: response.status,
        durationMs: now() - startedAt,
        timestamp: options.timestamp?.(),
        write,
      })
      return response
    },
  }
}
