import { describe, expect, it, vi } from 'vitest'
import { ProfileLoadCoordinator } from '@/lib/client-dashboard/profile-load-state'
import { createSessionProfileLoader } from '@/lib/client-dashboard/session-profile-loader'

const profile = {
  id: 'client-1',
  email: 'client@example.test',
  full_name: 'Client',
  avatar_url: null,
  role: 'client',
  status: 'active',
  onboarding_completed: true,
  preferred_locale: 'fr',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function setup(options: {
  identity?: unknown
  profileResult?: unknown
  cached?: unknown
  coordinator?: ProfileLoadCoordinator
} = {}) {
  const getCurrent = vi.fn(async () => options.identity ?? {
    ok: true, kind: 'authenticated', data: { id: 'client-1', email: 'client@example.test' },
  })
  const findById = vi.fn(async () => options.profileResult ?? { ok: true, data: profile })
  const cache = { get: vi.fn(() => options.cached ?? null), remove: vi.fn() }
  const loader = createSessionProfileLoader({
    identityRepository: { getCurrent } as never,
    profileRepository: { findById } as never,
    cache,
    coordinator: options.coordinator,
  })
  loader.switchUser('client-1')
  return { loader, getCurrent, findById, cache }
}

async function loadOnce(loader: ReturnType<typeof createSessionProfileLoader>, forceRefresh = false, hasConfirmedProfile = false) {
  const operation = loader.begin('client-1')
  expect(operation).not.toBeNull()
  const result = await operation!.load({ forceRefresh, hasConfirmedProfile })
  operation!.finish()
  return result
}

describe('client dashboard session/profile loader', () => {
  it('loads the profile only after the repository identity matches', async () => {
    const { loader, getCurrent, findById } = setup()
    expect(await loadOnce(loader)).toEqual({ kind: 'profile', profile })
    expect(getCurrent).toHaveBeenCalledOnce()
    expect(findById).toHaveBeenCalledWith('client-1')
  })

  it('distinguishes confirmed absence, repository failure, and missing session', async () => {
    const absent = setup({ profileResult: { ok: false, kind: 'not_found' } })
    expect(await loadOnce(absent.loader)).toEqual({ kind: 'not_found' })

    const failure = setup({ profileResult: { ok: false, kind: 'failure', error: { kind: 'unavailable' } } })
    expect(await loadOnce(failure.loader)).toEqual({ kind: 'error' })

    const anonymous = setup({ identity: { ok: false, kind: 'anonymous' } })
    expect(await loadOnce(anonymous.loader)).toEqual({ kind: 'anonymous' })
    expect(anonymous.findById).not.toHaveBeenCalled()
  })

  it('keeps a confirmed profile ready when a refresh read fails', async () => {
    const { loader } = setup({ profileResult: { ok: false, kind: 'failure', error: { kind: 'unavailable' } } })
    expect(await loadOnce(loader, true, true)).toEqual({ kind: 'retained' })
  })

  it('accepts only owner-scoped cache and removes a mismatched envelope', async () => {
    const valid = setup({ cached: { ownerUserId: 'client-1', profileData: { id: 'client-1' } } })
    expect(await loadOnce(valid.loader)).toMatchObject({ kind: 'cache' })
    expect(valid.findById).not.toHaveBeenCalled()

    const mismatched = setup({ cached: { ownerUserId: 'client-2', profileData: { id: 'client-1' } } })
    expect(await loadOnce(mismatched.loader)).toEqual({ kind: 'profile', profile })
    expect(mismatched.cache.remove).toHaveBeenCalledWith('dashboard_client-1')
  })

  it('ignores a stale profile response after an identity switch', async () => {
    let resolveProfile!: (value: { ok: true; data: typeof profile }) => void
    const pending = new Promise<{ ok: true; data: typeof profile }>(resolve => { resolveProfile = resolve })
    const { loader, findById } = setup()
    findById.mockImplementationOnce(async () => pending)
    const operation = loader.begin('client-1')!
    const resultPromise = operation.load({ forceRefresh: true, hasConfirmedProfile: false })
    await vi.waitFor(() => expect(findById).toHaveBeenCalledOnce())
    loader.switchUser('client-2')
    resolveProfile({ ok: true, data: profile })
    expect(await resultPromise).toEqual({ kind: 'stale' })
    operation.finish()
  })

  it('supports manual retry and refuses concurrent loads', async () => {
    const { loader } = setup({ profileResult: { ok: false, kind: 'failure', error: { kind: 'unavailable' } } })
    const first = loader.begin('client-1')!
    expect(loader.begin('client-1')).toBeNull()
    expect(await first.load({ forceRefresh: true, hasConfirmedProfile: false })).toEqual({ kind: 'error' })
    first.finish()

    const retry = loader.begin('client-1')
    expect(retry).not.toBeNull()
    retry!.finish()
  })

  it('survives the Strict Mode setup-cleanup-setup cycle without reviving work', async () => {
    const coordinator = new ProfileLoadCoordinator()
    const { loader } = setup({ coordinator })
    loader.mount()
    const stale = loader.begin('client-1')!
    loader.unmount()
    loader.mount()
    expect(stale.isCurrent()).toBe(false)
    expect(loader.begin('client-1')).not.toBeNull()
  })
})
