import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  verifyAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
  logAdminAction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: mocks.from },
}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: mocks.verifyAdmin,
  handleAdminAuthError: () => new Response(
    JSON.stringify({ error: 'Internal server error' }),
    { status: 500 },
  ),
}))
vi.mock('@/lib/admin/logger', () => ({
  logAdminAction: mocks.logAdminAction,
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

import { grantAdminLegacyInvitedAccess } from '@/lib/entitlements/admin-legacy-entitlement-writer'
import { POST } from '@/app/api/admin/users/[id]/entitlements/legacy-invited/route'
import { PATCH as patchSubscription } from '@/app/api/admin/users/[id]/subscription/route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-08-24T12:00:00.000Z')

describe('admin legacy entitlement writer migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insert.mockResolvedValue({ error: null })
    mocks.single.mockResolvedValue({
      data: { email: 'target@example.test' },
      error: null,
    })
    mocks.eq.mockReturnValue({ single: mocks.single })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockImplementation((table: string) => (
      table === 'legacy_entitlements'
        ? { insert: mocks.insert }
        : { select: mocks.select }
    ))
    mocks.verifyAdmin.mockResolvedValue({
      userId: ADMIN_ID,
      email: 'admin@example.test',
    })
    mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })
    mocks.logAdminAction.mockResolvedValue(undefined)
  })

  it('removes invited from the writable subscription contract', () => {
    const route = readFileSync(
      'app/api/admin/users/[id]/subscription/route.ts',
      'utf8',
    )
    const dialog = readFileSync(
      'app/(application)/admin/users/_components/SubscriptionDialog.tsx',
      'utf8',
    )

    expect(route).not.toMatch(/z\.enum\(\[[\s\S]*?['"]invited['"][\s\S]*?\]\)\.nullable\(\)/)
    expect(dialog).not.toMatch(
      /value:\s*['"]invited['"]/,
    )
    expect(dialog).not.toMatch(
      /subscription_type\s*={2,3}\s*['"]invited['"]/,
    )
    expect(dialog).toContain('WritableSubscriptionType')
  })

  it('rejects invited through the runtime subscription endpoint', async () => {
    const response = await patchSubscription(
      new Request('http://localhost/api/admin/users/subscription', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subscription_type: 'invited',
          subscription_status: 'active',
        }),
      }),
      { params: Promise.resolve({ id: USER_ID }) },
    )

    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('creates a bounded server-side legacy entitlement without relation data', async () => {
    await expect(grantAdminLegacyInvitedAccess({
      userId: USER_ID,
      actorId: ADMIN_ID,
      now: NOW,
    })).resolves.toEqual({ kind: 'created' })

    expect(mocks.from).toHaveBeenCalledWith('legacy_entitlements')
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      type: 'legacy_invited_access',
      source: 'admin',
      starts_at: NOW.toISOString(),
      ends_at: null,
      created_by: ADMIN_ID,
      metadata: { origin: 'admin_console' },
    })
    expect(JSON.stringify(mocks.insert.mock.calls)).not.toMatch(
      /coach_clients|coach_id|subscription_type|subscription_status|stripe/i,
    )
  })

  it('routes an authenticated, rate-limited admin grant to the legacy writer', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/users/legacy-entitlement', {
        method: 'POST',
        headers: { authorization: 'Bearer test-token' },
      }),
      { params: Promise.resolve({ id: USER_ID }) },
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ outcome: 'created' })
    expect(mocks.verifyAdmin).toHaveBeenCalledOnce()
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      `admin-legacy-entitlement:${ADMIN_ID}`,
      10,
      60_000,
    )
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.from).toHaveBeenCalledWith('legacy_entitlements')
    expect(mocks.logAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'legacy_entitlement_grant',
      target_user_id: USER_ID,
      metadata: expect.objectContaining({ source: 'admin' }),
    }))
  })

  it('rate-limits the admin grant before any profile or entitlement write', async () => {
    mocks.checkRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    })

    const response = await POST(
      new Request('http://localhost/api/admin/users/legacy-entitlement', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: USER_ID }) },
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('30')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('preserves an existing grant on idempotent retries', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505' } })

    await expect(grantAdminLegacyInvitedAccess({
      userId: USER_ID,
      actorId: ADMIN_ID,
      now: NOW,
    })).resolves.toEqual({ kind: 'already_exists' })

    expect(mocks.insert).toHaveBeenCalledOnce()
  })

  it('rejects invalid authority before accessing the database', async () => {
    await expect(grantAdminLegacyInvitedAccess({
      userId: 'not-a-user-id',
      actorId: ADMIN_ID,
      now: NOW,
    })).rejects.toThrow('INVALID_ADMIN_LEGACY_ENTITLEMENT_GRANT')

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('fails without leaking database error details', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.insert.mockResolvedValue({
      error: { code: 'DB_TIMEOUT', message: 'sensitive database detail' },
    })

    await expect(grantAdminLegacyInvitedAccess({
      userId: USER_ID,
      actorId: ADMIN_ID,
      now: NOW,
    })).rejects.toThrow('ADMIN_LEGACY_ENTITLEMENT_GRANT_FAILED')

    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive')
    errorLog.mockRestore()
  })

  it('keeps commercial subscription and Stripe code outside the writer', () => {
    const writer = readFileSync(
      'lib/entitlements/admin-legacy-entitlement-writer.ts',
      'utf8',
    )
    const subscriptionRoute = readFileSync(
      'app/api/admin/users/[id]/subscription/route.ts',
      'utf8',
    )

    expect(writer).not.toMatch(/profiles|subscription_type|subscription_status|stripe/i)
    expect(subscriptionRoute).toContain("'client_monthly'")
    expect(subscriptionRoute).toContain("'lifetime'")
    expect(subscriptionRoute).toContain("'trial'")
  })

  it('keeps historical invited profiles readable through the central fallback', () => {
    expect(resolveEffectiveEntitlement({
      subscriptionType: 'invited',
      legacyEntitlements: [],
      now: NOW,
    })).toEqual({ type: 'legacy_invited', source: 'subscription' })
  })
})
