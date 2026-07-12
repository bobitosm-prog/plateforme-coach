import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NextResponse } from 'next/server'
import { createSecurityAudit, isValidCorrelationId } from '../../lib/security/audit-log'

function request(correlationId?: string) {
  const headers = new Headers()
  if (correlationId) headers.set('x-request-id', correlationId)
  return new Request('http://localhost/api/test', { headers })
}

function event() {
  return {
    event: 'AUTH_REJECTED',
    domain: 'stripe' as const,
    operation: 'POST /api/stripe/connect',
    outcome: 'rejected' as const,
    reason: 'AUTH_REQUIRED',
    status: 401,
  }
}

beforeEach(() => vi.restoreAllMocks())

describe('security audit log contract', () => {
  it('writes one structured JSON record with every required field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audit = createSecurityAudit(request('request_ABC-1234'))
    const response = audit.reject(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), event())
    const record = JSON.parse(String(warn.mock.calls[0][0]))

    expect(record).toEqual(expect.objectContaining({
      level: 'warning',
      event: 'AUTH_REJECTED',
      domain: 'stripe',
      operation: 'POST /api/stripe/connect',
      outcome: 'rejected',
      reason: 'AUTH_REQUIRED',
      correlation_id: 'request_ABC-1234',
      context: { status: 401 },
    }))
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(response.status).toBe(401)
    expect(response.headers.get('x-request-id')).toBe('request_ABC-1234')
  })

  it.each(['short', ' space invalid ', 'slash/is/not/valid', 'a'.repeat(65), ''])('rejects malformed incoming correlation id %j and generates one', (incoming) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audit = createSecurityAudit(request(incoming))
    const response = audit.reject(NextResponse.json({}, { status: 403 }), { ...event(), status: 403 })
    const generated = response.headers.get('x-request-id')

    expect(generated).toMatch(/^[0-9a-f-]{36}$/)
    expect(generated).not.toBe(incoming)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('accepts only the strict correlation id format', () => {
    expect(isValidCorrelationId('request_ABC-1234')).toBe(true)
    expect(isValidCorrelationId('12345678')).toBe(true)
    expect(isValidCorrelationId('bad id')).toBe(false)
    expect(isValidCorrelationId(null)).toBe(false)
  })

  it('drops sensitive context fields and does not serialize secrets', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audit = createSecurityAudit(request())
    audit.reject(NextResponse.json({}, { status: 403 }), {
      ...event(),
      status: 403,
      context: {
        token: 'Bearer top-secret',
        email: 'person@example.test',
        cookie: 'session=value',
        stripe_signature: 'signature-secret',
        payload: '{"private":true}',
        event_type: 'checkout.session.completed',
      },
    })
    const serialized = String(warn.mock.calls[0][0])

    expect(serialized).not.toContain('top-secret')
    expect(serialized).not.toContain('person@example.test')
    expect(serialized).not.toContain('session=value')
    expect(serialized).not.toContain('signature-secret')
    expect(serialized).not.toContain('private')
    expect(JSON.parse(serialized).context.event_type).toBe('checkout.session.completed')
  })

  it('logs a rejection at most once per request context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audit = createSecurityAudit(request())

    audit.reject(NextResponse.json({}, { status: 401 }), event())
    audit.reject(NextResponse.json({}, { status: 403 }), { ...event(), reason: 'ROLE_FORBIDDEN', status: 403 })

    expect(warn).toHaveBeenCalledTimes(1)
  })
})
