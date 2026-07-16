import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import { createIdentityRepository } from '../../lib/repositories/identity'
import { createProfileRepository, type SafeProfileUpdate } from '../../lib/repositories/profile'
import { createSubscriptionRepository, normalizeSubscription } from '../../lib/repositories/subscription'
import { createSubscriptionAuthorityRepository } from '../../lib/repositories/subscription/authority'

vi.mock('server-only', () => ({}))

function clientWith(result: unknown, user: unknown = null) {
  const maybeSingle = vi.fn(async () => result)
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle,
    update: vi.fn(() => chain),
  }
  const client = {
    from: vi.fn(() => chain),
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
  } as unknown as DatabaseClient
  return { client, chain, maybeSingle }
}

const profile = {
  id: 'client-id', email: 'client@example.test', full_name: 'Client', avatar_url: null,
  role: 'client', status: 'active', onboarding_completed: true, preferred_locale: 'fr',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

describe('Supabase repositories', () => {
  it('returns found, absent, failure and RLS results distinctly for profiles', async () => {
    expect(await createProfileRepository(clientWith({ data: profile, error: null }).client).findById('client-id')).toEqual({ ok: true, data: profile })
    expect(await createProfileRepository(clientWith({ data: null, error: null }).client).findById('missing')).toEqual({ ok: false, kind: 'not_found' })
    expect(await createProfileRepository(clientWith({ data: null, error: { code: 'PGRST000', message: 'raw network detail' } }).client).findById('id')).toEqual({ ok: false, kind: 'failure', error: { kind: 'unavailable', contextCode: 'PGRST000' } })
    const forbidden = await createProfileRepository(clientWith({ data: null, error: { code: '42501', message: 'SQL secret' } }).client).findById('id')
    expect(forbidden).toEqual({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(JSON.stringify(forbidden)).not.toContain('SQL secret')
  })

  it('uses exact projections and supports safe updates only', async () => {
    const mock = clientWith({ data: profile, error: null })
    const patch: SafeProfileUpdate = { full_name: 'Updated', preferred_locale: 'en' }
    await createProfileRepository(mock.client).updateSafe('client-id', patch)
    expect(mock.chain.update).toHaveBeenCalledWith(patch)
    expect(mock.chain.select).toHaveBeenCalledWith('id,email,full_name,avatar_url,role,status,onboarding_completed,preferred_locale,created_at,updated_at')
    // @ts-expect-error authority fields are excluded from SafeProfileUpdate
    const unsafe: SafeProfileUpdate = { role: 'admin' }
    expect(unsafe).toEqual({ role: 'admin' })
  })

  it('reads current identity with getUser and never accepts an external id', async () => {
    const authenticated = clientWith({ data: null, error: null }, { id: 'auth-id', email: 'auth@example.test' })
    expect(await createIdentityRepository(authenticated.client).getCurrent()).toEqual({ ok: true, kind: 'authenticated', data: { id: 'auth-id', email: 'auth@example.test' } })
    expect((authenticated.client.auth.getUser as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce()
    expect(Object.keys(createIdentityRepository(authenticated.client))).toEqual(['getCurrent'])
  })

  it('distinguishes anonymous and Auth failure without leaking raw errors', async () => {
    const anonymous = clientWith({ data: null, error: null })
    expect(await createIdentityRepository(anonymous.client).getCurrent()).toEqual({ ok: false, kind: 'anonymous' })
    const authClient = { auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: { code: 'auth_failed', message: 'token secret' } })) } } as unknown as DatabaseClient
    const failed = await createIdentityRepository(authClient).getCurrent()
    expect(failed).toEqual({ ok: false, kind: 'failure', error: { kind: 'auth', contextCode: 'auth_failed' } })
    expect(JSON.stringify(failed)).not.toContain('token secret')
  })

  it.each([
    { type: 'client_monthly', status: 'active', trial: null, access: 'active', trialState: 'none' },
    { type: 'invited', status: null, trial: null, access: 'invited', trialState: 'none' },
    { type: 'lifetime', status: 'lifetime', trial: null, access: 'lifetime', trialState: 'none' },
    { type: null, status: null, trial: '2026-07-17T00:00:00Z', access: 'active', trialState: 'active' },
    { type: null, status: null, trial: '2026-07-15T00:00:00Z', access: 'inactive', trialState: 'expired' },
    { type: null, status: null, trial: 'invalid', access: 'inactive', trialState: 'invalid' },
  ])('normalizes subscription $type/$status', ({ type, status, trial, access, trialState }) => {
    const result = normalizeSubscription({ id: 'id', subscription_type: type, subscription_status: status, subscription_end_date: null, trial_ends_at: trial }, new Date('2026-07-16T00:00:00Z'))
    expect(result.access).toBe(access)
    expect(result.trial).toBe(trialState)
  })

  it('reads subscriptions and keeps authority mutations in a server-only module', async () => {
    const row = { id: 'id', subscription_type: 'invited', subscription_status: null, subscription_end_date: null, trial_ends_at: null }
    expect((await createSubscriptionRepository(clientWith({ data: row, error: null }).client).findByProfileId('id'))).toMatchObject({ ok: true, data: { access: 'invited' } })
    const authority = clientWith({ data: { ...row, subscription_type: 'lifetime' }, error: null })
    await createSubscriptionAuthorityRepository(authority.client).updateByProfileId('id', { subscription_type: 'lifetime' })
    expect(authority.chain.update).toHaveBeenCalledWith({ subscription_type: 'lifetime' })
    expect(readFileSync(new URL('../../lib/repositories/subscription/authority.ts', import.meta.url), 'utf8')).toMatch(/^import 'server-only'/)
  })

  it('has exhaustive discriminated results and no React, Next or admin imports', () => {
    const source = ['result.ts', 'identity/index.ts', 'profile/index.ts', 'subscription/index.ts']
      .map((file) => readFileSync(new URL(`../../lib/repositories/${file}`, import.meta.url), 'utf8')).join('\n')
    expect(source).not.toMatch(/react|next\/|supabase\/admin|createClient/)
    expectTypeOf<ReturnType<typeof createProfileRepository>>().toBeObject()
  })
})
