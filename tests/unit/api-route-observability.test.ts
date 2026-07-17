import { describe, expect, it, vi } from 'vitest'

import { apiFailureResponse } from '../../lib/api/response'
import { createApiRouteObservability } from '../../lib/api/route-observability'

const request = (requestId?: string) => new Request('http://localhost/api/test?token=hidden', {
  headers: requestId ? { 'x-request-id': requestId } : undefined,
})

const descriptor = { event: 'TEST_REQUEST', domain: 'test', operation: 'GET /api/test' }

describe('API route observability', () => {
  it('reuses a valid incoming ID in the response and structured log', () => {
    const writes: string[] = []
    const observe = createApiRouteObservability(request('request_ABC-1234'), descriptor, {
      now: () => 100,
      timestamp: () => '2026-07-17T00:00:00.000Z',
      write: (_level, serialized) => writes.push(serialized),
    })
    const response = observe.complete(Response.json({ legacy: true }), {
      outcome: 'success', reason: 'COMPLETED',
    })
    expect(response.headers.get('x-request-id')).toBe('request_ABC-1234')
    expect(JSON.parse(writes[0])).toMatchObject({
      request_id: 'request_ABC-1234', outcome: 'success', status: 200, duration_ms: 0,
    })
  })

  it('replaces an invalid ID once and keeps ApiResponse body/header coherent', async () => {
    const input = request('invalid')
    const response = apiFailureResponse(input, {
      status: 401, code: 'AUTH_REQUIRED', message: 'Authentication required',
    })
    const writes: string[] = []
    const observe = createApiRouteObservability(input, descriptor, {
      write: (_level, serialized) => writes.push(serialized),
    })
    const completed = observe.complete(response, { outcome: 'rejected', reason: 'AUTH_REQUIRED' })
    const generated = completed.headers.get('x-request-id')
    expect(generated).toMatch(/^[0-9a-f-]{36}$/)
    expect((await completed.json()).meta.requestId).toBe(generated)
    expect(JSON.parse(writes[0]).request_id).toBe(generated)
  })

  it('drops sensitive keys and values and bounds the public context', () => {
    const writes: string[] = []
    const observe = createApiRouteObservability(request(), descriptor, {
      write: (_level, serialized) => writes.push(serialized),
    })
    observe.complete(new Response(null, { status: 500 }), {
      outcome: 'failed',
      reason: 'INTERNAL_ERROR',
      context: {
        token: 'known-token',
        authorization: 'Bearer known-secret',
        email: 'person@example.test',
        payload: 'raw-body',
        full_url: 'https://example.test/private',
        stack: 'Error at private.ts:1',
        provider: 'anthropic-secret',
        safe_count: 2,
        oversized_count: Number.MAX_VALUE,
      },
    })
    const serialized = writes[0]
    expect(serialized).not.toMatch(/known-token|known-secret|example\.test|person@|raw-body|private\.ts|anthropic-secret/i)
    expect(JSON.parse(serialized).context).toEqual({ safe_count: 2, oversized_count: 1_000_000_000 })
  })

  it('logs at most once while propagating the ID to every completed response', () => {
    const write = vi.fn()
    const observe = createApiRouteObservability(request(), descriptor, { write })
    const first = observe.complete(new Response(null, { status: 400 }), {
      outcome: 'rejected', reason: 'VALIDATION_ERROR',
    })
    const second = observe.complete(new Response(null, { status: 500 }), {
      outcome: 'failed', reason: 'INTERNAL_ERROR',
    })
    expect(write).toHaveBeenCalledTimes(1)
    expect(second.headers.get('x-request-id')).toBe(first.headers.get('x-request-id'))
  })
})
