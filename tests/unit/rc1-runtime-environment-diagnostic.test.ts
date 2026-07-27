import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const routeMocks = vi.hoisted(() => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: routeMocks.verifyAdmin,
  handleAdminAuthError: routeMocks.handleAdminAuthError,
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: routeMocks.checkRateLimit,
}))

import { GET } from '@/app/api/admin/rc1/environment/route'
import { buildRuntimeEnvironmentDiagnostic } from '@/lib/preproduction/runtime-environment-diagnostic'

const secretSentinels = {
  stripeTest: ['sk', 'test', 'rc1-sensitive-placeholder'].join('_'),
  stripeLive: ['sk', 'live', 'rc1-sensitive-placeholder'].join('_'),
  stripeUnknown: ['rk', 'custom', 'rc1-sensitive-placeholder'].join('_'),
  platformWebhook: ['whsec', 'platform-rc1-sensitive-placeholder'].join('_'),
  connectWebhook: ['whsec', 'connect-rc1-sensitive-placeholder'].join('_'),
  supabaseAnon: 'rc1-sensitive-anon-placeholder',
  supabaseServiceRole: 'rc1-sensitive-service-placeholder',
}

const runtimeKeys = [
  'MOOVX_ENVIRONMENT',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_EXPECTED_LIVEMODE',
  'STRIPE_PLATFORM_WEBHOOK_SECRET',
  'STRIPE_CONNECT_WEBHOOK_SECRET',
] as const
const originalRuntimeEnvironment = Object.fromEntries(
  runtimeKeys.map(key => [key, process.env[key]]),
)

beforeEach(() => {
  vi.clearAllMocks()
  routeMocks.verifyAdmin.mockResolvedValue({
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'admin@moovx.invalid',
  })
  routeMocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 4 })
})

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of runtimeKeys) {
    const originalValue = originalRuntimeEnvironment[key]
    if (originalValue === undefined) delete process.env[key]
    else process.env[key] = originalValue
  }
})

describe('RC1 runtime environment diagnostic', () => {
  it('classifies an sk_test secret as test', () => {
    const diagnostic = buildRuntimeEnvironmentDiagnostic({
      STRIPE_SECRET_KEY: secretSentinels.stripeTest,
    })

    expect(diagnostic.stripe.secret_key_class).toBe('test')
  })

  it('classifies an sk_live secret as live', () => {
    const diagnostic = buildRuntimeEnvironmentDiagnostic({
      STRIPE_SECRET_KEY: secretSentinels.stripeLive,
    })

    expect(diagnostic.stripe.secret_key_class).toBe('live')
  })

  it('classifies an absent or unsupported Stripe secret as unknown', () => {
    expect(buildRuntimeEnvironmentDiagnostic({}).stripe.secret_key_class).toBe('unknown')
    expect(buildRuntimeEnvironmentDiagnostic({
      STRIPE_SECRET_KEY: secretSentinels.stripeUnknown,
    }).stripe.secret_key_class).toBe('unknown')
  })

  it('returns only classifications, the public project ref and presence booleans', () => {
    const diagnostic = buildRuntimeEnvironmentDiagnostic({
      MOOVX_ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SUPABASE_URL: 'https://cycbnnojcymjnaqomlyj.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: secretSentinels.supabaseAnon,
      SUPABASE_SERVICE_ROLE_KEY: secretSentinels.supabaseServiceRole,
      STRIPE_SECRET_KEY: secretSentinels.stripeTest,
      STRIPE_WEBHOOK_EXPECTED_LIVEMODE: 'false',
      STRIPE_PLATFORM_WEBHOOK_SECRET: secretSentinels.platformWebhook,
      STRIPE_CONNECT_WEBHOOK_SECRET: secretSentinels.connectWebhook,
    })

    expect(diagnostic).toEqual({
      environment: 'staging',
      supabase: { project_ref: 'cycbnnojcymjnaqomlyj' },
      stripe: {
        secret_key_class: 'test',
        webhook_expected_livemode: false,
      },
      webhook: {
        platform_secret_present: true,
        connect_secret_present: true,
      },
    })

    const serialized = JSON.stringify(diagnostic)
    expect(serialized).not.toContain('supabase.co')
    for (const secret of Object.values(secretSentinels)) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('uses unknown or null for malformed runtime values', () => {
    expect(buildRuntimeEnvironmentDiagnostic({
      MOOVX_ENVIRONMENT: 'release-candidate',
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      STRIPE_WEBHOOK_EXPECTED_LIVEMODE: 'test',
    })).toEqual({
      environment: 'unknown',
      supabase: { project_ref: null },
      stripe: {
        secret_key_class: 'unknown',
        webhook_expected_livemode: 'unknown',
      },
      webhook: {
        platform_secret_present: false,
        connect_secret_present: false,
      },
    })
  })

  it('keeps the route admin-only, rate-limited and free of env-file fallback', () => {
    const route = readFileSync(
      'app/api/admin/rc1/environment/route.ts',
      'utf8',
    )
    const diagnostic = readFileSync(
      'lib/preproduction/runtime-environment-diagnostic.ts',
      'utf8',
    )

    expect(route).toContain('await verifyAdmin(request)')
    expect(route).toContain('checkRateLimit(')
    expect(route).toContain('buildRuntimeEnvironmentDiagnostic(process.env)')
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(`${route}\n${diagnostic}`).not.toMatch(
      /(?:readFile|dotenv|\.env\.local|\.env\.preview|\.env\.production)/,
    )
  })

  it('serves the expurgated runtime contract after the admin and rate-limit gates', async () => {
    process.env.MOOVX_ENVIRONMENT = 'staging'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://cycbnnojcymjnaqomlyj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = secretSentinels.supabaseAnon
    process.env.SUPABASE_SERVICE_ROLE_KEY = secretSentinels.supabaseServiceRole
    process.env.STRIPE_SECRET_KEY = secretSentinels.stripeTest
    process.env.STRIPE_WEBHOOK_EXPECTED_LIVEMODE = 'false'
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = secretSentinels.platformWebhook
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = secretSentinels.connectWebhook

    const response = await GET(new Request(
      'https://preview.vercel.app/api/admin/rc1/environment',
      {
        headers: {
          authorization: 'Bearer redacted-admin-token',
          'x-forwarded-for': '192.0.2.10, 198.51.100.4',
        },
      },
    ))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    await expect(response.json()).resolves.toEqual({
      environment: 'staging',
      supabase: { project_ref: 'cycbnnojcymjnaqomlyj' },
      stripe: {
        secret_key_class: 'test',
        webhook_expected_livemode: false,
      },
      webhook: {
        platform_secret_present: true,
        connect_secret_present: true,
      },
    })
    expect(routeMocks.verifyAdmin).toHaveBeenCalledOnce()
    expect(routeMocks.checkRateLimit).toHaveBeenCalledWith(
      'rc1-environment:00000000-0000-4000-8000-000000000001:192.0.2.10',
      5,
      60_000,
    )
  })

  it('rate-limits the diagnostic without returning runtime classifications', async () => {
    routeMocks.checkRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfter: 42,
    })
    process.env.STRIPE_SECRET_KEY = secretSentinels.stripeTest

    const response = await GET(new Request(
      'https://preview.vercel.app/api/admin/rc1/environment',
      { headers: { authorization: 'Bearer redacted-admin-token' } },
    ))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('42')
    await expect(response.json()).resolves.toEqual({ error: 'Too many requests' })
  })
})
