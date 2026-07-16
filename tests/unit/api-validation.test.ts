import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { validateJsonBody, validateQuery, validateRouteParams, validateValue } from '../../lib/api/validation'

const request = (body?: string, headers: Record<string, string> = {}, url = 'http://localhost/api/test') =>
  new Request(url, { method: body === undefined ? 'GET' : 'POST', body, headers })

async function body(result: { ok: false; response: Response }) {
  return result.response.json()
}

describe('API validation helpers', () => {
  it('infers valid JSON including transform and refine', async () => {
    const schema = z.object({ name: z.string().trim().transform((value) => value.toUpperCase()), age: z.number().refine((v) => v >= 18) }).strict()
    const result = await validateJsonBody(request('{"name":" Ada ","age":20}', { 'content-type': 'application/json' }), schema)
    expect(result).toEqual({ ok: true, data: { name: 'ADA', age: 20 } })
    if (result.ok) expectTypeOf(result.data).toEqualTypeOf<{ name: string; age: number }>()
  })

  it.each([
    { raw: '{', code: 'malformed_json' },
    { raw: '', code: 'body_required' },
  ])('handles invalid body syntax: $code', async ({ raw, code }) => {
    const result = await validateJsonBody(request(raw, { 'content-type': 'application/json' }), z.object({ id: z.string() }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect((await body(result)).error.details.issues[0].code).toBe(code)
  })

  it('rejects missing or wrong content type and oversized bodies', async () => {
    const schema = z.object({ id: z.string() })
    for (const result of [
      await validateJsonBody(request('{"id":"x"}'), schema),
      await validateJsonBody(request('{"id":"long"}', { 'content-type': 'application/json' }), schema, { maxBytes: 5 }),
    ]) expect(result.ok).toBe(false)
  })

  it('returns controlled issues for missing, wrong, unknown, long and nested fields', async () => {
    const schema = z.object({ profile: z.object({ name: z.string().max(3), tags: z.array(z.number()) }).strict() }).strict()
    const result = validateValue(request(), schema, { profile: { name: 'hostile-long', tags: ['x'], extra: true } })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await body(result)
      expect(payload.error.details.issues.map((issue: { code: string }) => issue.code)).toEqual(['unknown_key', 'too_big', 'invalid_type'])
      expect(JSON.stringify(payload)).not.toContain('hostile-long')
    }
  })

  it('handles simple, empty and repeated query values without implicit coercion', () => {
    const schema = z.object({ q: z.string(), empty: z.literal(''), tag: z.array(z.string()) }).strict()
    expect(validateQuery(request(undefined, {}, 'http://localhost/api/test?q=run&empty=&tag=a&tag=b'), schema)).toEqual({
      ok: true, data: { q: 'run', empty: '', tag: ['a', 'b'] },
    })
    expect(validateQuery(request(undefined, {}, 'http://localhost/api/test?n=2'), z.object({ n: z.number() })).ok).toBe(false)
    expect(validateQuery(request(undefined, {}, 'http://localhost/api/test?n=2'), z.object({ n: z.coerce.number() }))).toEqual({ ok: true, data: { n: 2 } })
  })

  it('validates promised route parameters', async () => {
    expect(await validateRouteParams(request(), Promise.resolve({ id: 'abc' }), z.object({ id: z.string().min(1) }).strict())).toEqual({ ok: true, data: { id: 'abc' } })
  })

  it('sorts and limits issues deterministically', async () => {
    const shape = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`field${String(i).padStart(2, '0')}`, z.string()]))
    const result = validateValue(request(), z.object(shape), {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const details = (await body(result)).error.details
      expect(details.issues).toHaveLength(8)
      expect(details.truncated).toBe(true)
      expect(details.issues.map((issue: { path: string }) => issue.path)).toEqual([...details.issues.map((issue: { path: string }) => issue.path)].sort())
    }
  })

  it('bounds hostile paths and hides sensitive field names and custom messages', async () => {
    const hostile = 'x'.repeat(200)
    const result = validateValue(request(), z.object({ password: z.string(), [hostile]: z.string().refine(() => false, 'person@example.test token=secret') }), { password: 42, [hostile]: 'value' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const serialized = JSON.stringify(await body(result))
      expect(serialized).not.toContain('password')
      expect(serialized).not.toContain('example.test')
      expect(serialized).not.toContain('secret')
      expect(serialized.length).toBeLessThan(1000)
    }
  })

  it.each(['request_ABC-1234', 'invalid'])('keeps request ID coherent for %s', async (incoming) => {
    const result = validateValue(request(undefined, { 'x-request-id': incoming }), z.object({ id: z.string() }), {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await body(result)
      expect(result.response.headers.get('x-request-id')).toBe(payload.meta.requestId)
      if (incoming.startsWith('request_')) expect(payload.meta.requestId).toBe(incoming)
      else expect(payload.meta.requestId).toMatch(/^[0-9a-f-]{36}$/)
      expect(payload).not.toHaveProperty('issues')
    }
  })
})
