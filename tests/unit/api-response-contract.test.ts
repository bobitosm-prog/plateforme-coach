import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  apiFailureResponse,
  apiNoContentResponse,
  apiSuccessResponse,
  createApiFailure,
  createApiSuccess,
  type ApiResponse,
} from '../../lib/api/response'

const request = (requestId?: string) => new Request('http://localhost/api/test', {
  headers: requestId ? { 'x-request-id': requestId } : undefined,
})

describe('API response contract', () => {
  it.each([{ value: { id: 'one' } }, { value: ['one'] }, { value: null }])('wraps JSON data: $value', ({ value }) => {
    expect(createApiSuccess(value)).toEqual({ ok: true, data: value })
  })

  it('supports discriminated union narrowing', () => {
    const read = (response: ApiResponse<{ id: string }>) => {
      if (response.ok) {
        expectTypeOf(response.data.id).toEqualTypeOf<string>()
        return response.data.id
      }
      expectTypeOf(response.error.code).toEqualTypeOf<string>()
      return response.error.code
    }
    expect(read(createApiSuccess({ id: 'one' }))).toBe('one')
  })

  it('creates a controlled failure without optional details', () => {
    expect(createApiFailure('request_ABC-1234', { code: 'AUTH_REQUIRED', message: 'Authentication required' })).toEqual({
      ok: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
      meta: { requestId: 'request_ABC-1234' },
    })
  })

  it('accepts and propagates an incoming request ID coherently', async () => {
    const response = apiFailureResponse(request('request_ABC-1234'), {
      status: 403,
      code: 'ROLE_FORBIDDEN',
      message: 'Operation forbidden',
    })
    expect(response.headers.get('x-request-id')).toBe('request_ABC-1234')
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect((await response.json()).meta.requestId).toBe('request_ABC-1234')
  })

  it('generates and propagates a request ID for success responses', async () => {
    const response = apiSuccessResponse(request('invalid'), { saved: true }, { status: 201 })
    const generated = response.headers.get('x-request-id')
    expect(generated).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.status).toBe(201)
    expect((await response.json()).meta.requestId).toBe(generated)
  })

  it.each([
    { unsafe: { missing: undefined } },
    { unsafe: { number: Number.NaN } },
    { unsafe: { number: Infinity } },
    { unsafe: { id: BigInt(1) } },
    { unsafe: { when: new Date() } },
  ])('rejects non-JSON data: $unsafe', ({ unsafe }) => {
    expect(() => createApiSuccess(unsafe)).toThrow(TypeError)
  })

  it('rejects circular data', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => createApiSuccess(circular)).toThrow(/circular/)
  })

  it.each([
    { details: { token: 'redacted' } },
    { details: { email: 'person@example.test' } },
    { details: { provider: 'Error: provider failed\n at internal.ts:1' } },
  ])('rejects sensitive or internal error details', ({ details }) => {
    expect(() => createApiFailure('request_ABC-1234', {
      code: 'UPSTREAM_FAILED', message: 'Service unavailable', details,
    })).toThrow(TypeError)
  })

  it('creates a bodyless 204 response with only the correlation header', async () => {
    const response = apiNoContentResponse(request('request_ABC-1234'))
    expect(response.status).toBe(204)
    expect(response.headers.get('x-request-id')).toBe('request_ABC-1234')
    expect(response.headers.get('content-type')).toBeNull()
    expect(await response.text()).toBe('')
  })
})
