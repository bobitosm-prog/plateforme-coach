import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createApiFailure } from '../../lib/api/response'
import {
  API_ERROR_CODES, API_ERROR_REGISTRY, LEGACY_API_ERROR_CODES,
  getApiErrorDescriptor, mapLegacyApiErrorCode, type ApiErrorCode,
} from '../../lib/api/errors'

const CHECKOUT_CONFIGURATION_OPERATOR_REASONS = [
  'PRICE_NOT_CONFIGURED',
  'SERVER_MISCONFIGURED',
] as const

const STRIPE_CONNECT_OPERATOR_REASON_PAIRS = [
  ['IDENTITY_MISMATCH', 'STRIPE_IDENTITY_INVALID'],
  ['PROFILE_UNAVAILABLE', 'RESOURCE_NOT_FOUND'],
] as const

const CHECKOUT_FAILURE_OPERATOR_REASONS = [
  'CHECKOUT_FAILED',
  'UPSTREAM_REJECTED',
] as const

function isCheckoutConfigurationOperatorReason(value: string): boolean {
  return CHECKOUT_CONFIGURATION_OPERATOR_REASONS.some(reason => reason === value)
}

function isStripeConnectOperatorReason(value: string): boolean {
  return STRIPE_CONNECT_OPERATOR_REASON_PAIRS.flat().some(reason => reason === value)
}

function isCheckoutFailureOperatorReason(value: string): boolean {
  return CHECKOUT_FAILURE_OPERATOR_REASONS.some(reason => reason === value)
}

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
    expect(mapLegacyApiErrorCode('PROFILE_UNAVAILABLE')).toBe('RESOURCE_NOT_FOUND')
    expect(mapLegacyApiErrorCode('SIGNATURE_INVALID')).toBe('STRIPE_SIGNATURE_INVALID')
    expect(mapLegacyApiErrorCode('PRICE_NOT_CONFIGURED')).toBe('SERVER_MISCONFIGURED')
    for (const canonical of Object.values(LEGACY_API_ERROR_CODES)) expect(API_ERROR_CODES).toContain(canonical)
  })

  it.each(CHECKOUT_CONFIGURATION_OPERATOR_REASONS)(
    'accepts checkout configuration reason %s during the bounded dual-read window',
    reason => {
      expect(isCheckoutConfigurationOperatorReason(reason)).toBe(true)
    },
  )

  it('keeps unrelated checkout reasons outside the configuration dual-read', () => {
    expect(isCheckoutConfigurationOperatorReason('CHECKOUT_FAILED')).toBe(false)
  })

  it('keeps operator contracts dual-read after the checkout producer becomes canonical', () => {
    const route = readFileSync('app/api/stripe/checkout/route.ts', 'utf8')
    const service = readFileSync('lib/billing/checkout/service.ts', 'utf8')
    const rollback = readFileSync('docs/PHASE_1_ROLLBACK.md', 'utf8')
    const taxonomy = readFileSync('docs/API_ERROR_TAXONOMY.md', 'utf8')

    expect(service).toContain("if (!priceId) throw new CheckoutServiceError('SERVER_MISCONFIGURED')")
    expect(service).not.toContain("throw new CheckoutServiceError('PRICE_NOT_CONFIGURED')")
    expect(route).toContain("error.code === 'SERVER_MISCONFIGURED'")
    expect(route).toContain("reason: 'SERVER_MISCONFIGURED'")
    expect(route).toContain("reason: 'CHECKOUT_FAILED'")
    for (const reason of CHECKOUT_CONFIGURATION_OPERATOR_REASONS) {
      expect(rollback).toContain(`\`${reason}\``)
      expect(taxonomy).toContain(`\`${reason}\``)
    }
    expect(rollback).toContain('Fenêtre dual-read configuration checkout')
    expect(taxonomy).toContain('contrat consommateur temporaire')
  })

  it.each(STRIPE_CONNECT_OPERATOR_REASON_PAIRS.flat())(
    'accepts Stripe Connect reason %s during the bounded dual-read window',
    reason => {
      expect(isStripeConnectOperatorReason(reason)).toBe(true)
    },
  )

  it('keeps unrelated Stripe Connect reasons outside the dual-read window', () => {
    expect(isStripeConnectOperatorReason('ROLE_FORBIDDEN')).toBe(false)
  })

  it('keeps operator contracts dual-read after Stripe Connect producers become canonical', () => {
    const route = readFileSync('app/api/stripe/connect/route.ts', 'utf8')
    const service = readFileSync('lib/billing/connect/service.ts', 'utf8')
    const rollback = readFileSync('docs/PHASE_1_ROLLBACK.md', 'utf8')
    const taxonomy = readFileSync('docs/API_ERROR_TAXONOMY.md', 'utf8')

    expect(route).toContain("throw new ConnectServiceError('STRIPE_IDENTITY_INVALID')")
    expect(route).toContain("case 'STRIPE_IDENTITY_INVALID': return NextResponse.json({ error: 'Forbidden' }, { status: 403 })")
    expect(route).toContain("case 'RESOURCE_NOT_FOUND': return NextResponse.json({ error: 'Profile not found' }, { status: 403 })")
    expect(service).toContain("throw new ConnectServiceError('STRIPE_IDENTITY_INVALID')")
    expect(service).toContain("throw new ConnectServiceError('RESOURCE_NOT_FOUND')")
    expect(route).not.toContain("throw new ConnectServiceError('IDENTITY_MISMATCH')")
    expect(service).not.toContain("throw new ConnectServiceError('PROFILE_UNAVAILABLE')")

    for (const reasons of STRIPE_CONNECT_OPERATOR_REASON_PAIRS) {
      for (const reason of reasons) {
        expect(rollback).toContain(`\`${reason}\``)
        expect(taxonomy).toContain(`\`${reason}\``)
      }
    }
    expect(rollback).toContain('Fenêtre dual-read Stripe Connect')
    expect(rollback).toContain('restent contractuellement `403`')
    expect(taxonomy).toContain('sans faire dériver le statut HTTP historique `403` vers `404`')
  })

  it.each(CHECKOUT_FAILURE_OPERATOR_REASONS)(
    'accepts checkout failure reason %s during the bounded dual-read window',
    reason => {
      expect(isCheckoutFailureOperatorReason(reason)).toBe(true)
    },
  )

  it('keeps unrelated upstream reasons outside the checkout failure dual-read', () => {
    expect(isCheckoutFailureOperatorReason('UPSTREAM_UNAVAILABLE')).toBe(false)
  })

  it('keeps both checkout producers legacy while failure contracts are dual-read', () => {
    const platformRoute = readFileSync('app/api/stripe/checkout/route.ts', 'utf8')
    const coachRoute = readFileSync('app/api/stripe/coach-checkout/route.ts', 'utf8')
    const rollback = readFileSync('docs/PHASE_1_ROLLBACK.md', 'utf8')
    const taxonomy = readFileSync('docs/API_ERROR_TAXONOMY.md', 'utf8')
    const legacyResponse = "NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })"

    for (const route of [platformRoute, coachRoute]) {
      expect(route).toContain(legacyResponse)
      expect(route).toContain("reason: 'CHECKOUT_FAILED', status: 500")
      expect(route).not.toContain("reason: 'UPSTREAM_REJECTED'")
    }
    for (const reason of CHECKOUT_FAILURE_OPERATOR_REASONS) {
      expect(rollback).toContain(`\`${reason}\``)
      expect(taxonomy).toContain(`\`${reason}\``)
    }
    expect(rollback).toContain('Fenêtre dual-read échec checkout')
    expect(rollback).toContain('restent contractuellement `500`')
    expect(taxonomy).toContain('ne doit jamais faire dériver leur statut HTTP historique `500` vers `502`')
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
