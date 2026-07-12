import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

export type SecurityAuditOutcome = 'rejected' | 'failed' | 'skipped'
export type SecurityAuditDomain = 'stripe' | 'coach_invitations' | 'push' | 'admin'

export interface SecurityAuditEvent {
  event: string
  domain: SecurityAuditDomain
  operation: string
  outcome: SecurityAuditOutcome
  reason: string
  status: number
  context?: Record<string, string | number | boolean | null>
}

export interface SecurityAuditRecord {
  timestamp: string
  level: 'warning'
  event: string
  domain: SecurityAuditDomain
  operation: string
  outcome: SecurityAuditOutcome
  reason: string
  correlation_id: string
  context: Record<string, string | number | boolean | null>
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/
const SAFE_NAME_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/
const BLOCKED_CONTEXT_KEY = /(token|secret|signature|cookie|session|email|body|payload|url|subscription|authorization|hash|key)/i

export function isValidCorrelationId(value: string | null): value is string {
  return typeof value === 'string' && CORRELATION_ID_PATTERN.test(value)
}

function safeContext(input: SecurityAuditEvent['context']) {
  const output: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(input ?? {})) {
    if (BLOCKED_CONTEXT_KEY.test(key)) continue
    if (typeof value === 'string') output[key] = value.slice(0, 64)
    else if (typeof value === 'number' && Number.isFinite(value)) output[key] = value
    else if (typeof value === 'boolean' || value === null) output[key] = value
  }
  return output
}

export function createSecurityAudit(request: Request) {
  const incoming = request.headers.get('x-request-id')
  const correlationId = isValidCorrelationId(incoming) ? incoming : randomUUID()
  let logged = false

  return {
    correlationId,
    reject(response: NextResponse, input: SecurityAuditEvent) {
      response.headers.set('x-request-id', correlationId)
      if (logged) return response
      logged = true

      const event = SAFE_NAME_PATTERN.test(input.event) ? input.event : 'SECURITY_REJECTION'
      const reason = SAFE_NAME_PATTERN.test(input.reason) ? input.reason : 'UNKNOWN_REJECTION'
      const record: SecurityAuditRecord = {
        timestamp: new Date().toISOString(),
        level: 'warning',
        event,
        domain: input.domain,
        operation: input.operation.slice(0, 80),
        outcome: input.outcome,
        reason,
        correlation_id: correlationId,
        context: { status: input.status, ...safeContext(input.context) },
      }
      console.warn(JSON.stringify(record))
      return response
    },
  }
}
