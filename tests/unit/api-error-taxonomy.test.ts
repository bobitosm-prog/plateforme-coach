import { describe, expect, expectTypeOf, it } from 'vitest'

import { createApiFailure } from '../../lib/api/response'
import {
  API_ERROR_CODES, API_ERROR_REGISTRY, LEGACY_API_ERROR_CODES,
  getApiErrorDescriptor, mapLegacyApiErrorCode, type ApiErrorCode,
} from '../../lib/api/errors'

describe('API error taxonomy', () => {
  it('contains unique codes and an exhaustive registry', () => {
    expect(new Set(API_ERROR_CODES).size).toBe(API_ERROR_CODES.length)
    expect(Object.keys(API_ERROR_REGISTRY).sort()).toEqual([...API_ERROR_CODES].sort())
  })

  it.each(API_ERROR_CODES)('%s has a safe and coherent descriptor', (code) => {
    const item = getApiErrorDescriptor(code)
    expect(item.status).toBeGreaterThanOrEqual(200)
    expect(item.status).toBeLessThanOrEqual(599)
    expect(item.message.trim()).not.toBe('')
    expect(item.message).not.toMatch(/@|bearer|cookie|password|secret|stack|sql|token/i)
    expect(['none', 'info', 'warning', 'error']).toContain(item.logLevel)
    expect(['never', 'client', 'server']).toContain(item.retry)
    if (['validation', 'authentication', 'authorization', 'not_found'].includes(item.category)) {
      expect(item.retry).toBe('never')
    }
    if (item.details === 'public_validation_only') expect(item.category).toBe('validation')
  })

  it('keeps details forbidden for auth, authorization and internal failures', () => {
    for (const item of Object.values(API_ERROR_REGISTRY)) {
      if (['authentication', 'authorization', 'internal'].includes(item.category)) {
        expect(item.details).toBe('forbidden')
      }
    }
  })

  it('maps principal legacy codes to known canonical codes', () => {
    expect(mapLegacyApiErrorCode('IDENTITY_MISMATCH')).toBe('STRIPE_IDENTITY_INVALID')
    expect(mapLegacyApiErrorCode('SIGNATURE_INVALID')).toBe('STRIPE_SIGNATURE_INVALID')
    for (const canonical of Object.values(LEGACY_API_ERROR_CODES)) expect(API_ERROR_CODES).toContain(canonical)
  })

  it('is coherent with ApiFailure', () => {
    const code: ApiErrorCode = 'AUTH_REQUIRED'
    const item = getApiErrorDescriptor(code)
    const failure = createApiFailure('request_ABC-1234', { code, message: item.message })
    expect(failure.error.code).toBe(code)
    expectTypeOf(failure.error.code).toEqualTypeOf<string>()
  })

  it('rejects unknown codes at compile time', () => {
    // @ts-expect-error unknown codes are not part of ApiErrorCode
    getApiErrorDescriptor('UNKNOWN_ERROR')
  })
})
