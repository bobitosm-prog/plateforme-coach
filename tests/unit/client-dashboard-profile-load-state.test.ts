import { describe, expect, it } from 'vitest'
import { decideProfileRead, isDashboardCacheOwnedBy, ProfileLoadCoordinator } from '@/lib/client-dashboard/profile-load-state'

describe('client dashboard profile load decision', () => {
  it('continues only when the repository confirms the profile', () => {
    expect(decideProfileRead({ ok: true, data: { id: 'client-1' } }, false)).toEqual({
      status: 'ready',
      redirectToOnboarding: false,
    })
  })

  it('redirects only for a confirmed absence', () => {
    expect(decideProfileRead({ ok: false, kind: 'not_found' }, false)).toEqual({
      status: 'not_found',
      redirectToOnboarding: true,
    })
  })

  it.each(['auth', 'forbidden', 'conflict', 'unavailable', 'unexpected'] as const)(
    'keeps a %s repository failure recoverable without redirect',
    kind => {
      expect(decideProfileRead({ ok: false, kind: 'failure', error: { kind } }, false)).toEqual({
        status: 'error',
        redirectToOnboarding: false,
      })
    },
  )

  it('keeps a previously confirmed profile usable when a refresh fails', () => {
    expect(decideProfileRead({
      ok: false,
      kind: 'failure',
      error: { kind: 'unavailable' },
    }, true)).toEqual({ status: 'ready', redirectToOnboarding: false })
  })
})

describe('client dashboard cache ownership', () => {
  it('accepts a cache only when envelope and profile match the active user', () => {
    expect(isDashboardCacheOwnedBy({
      ownerUserId: 'client-1',
      profileData: { id: 'client-1' },
    }, 'client-1')).toBe(true)
  })

  it.each([
    null,
    { profileData: { id: 'client-1' } },
    { ownerUserId: 'client-2', profileData: { id: 'client-1' } },
    { ownerUserId: 'client-1', profileData: { id: 'client-2' } },
  ])('rejects missing, legacy, or cross-user cache values', cached => {
    expect(isDashboardCacheOwnedBy(cached, 'client-1')).toBe(false)
  })
})

describe('profile load request coordinator', () => {
  it('allows a controlled retry after an error and does not loop by itself', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.switchUser('client-1')
    const first = coordinator.begin('client-1')
    expect(first).not.toBeNull()
    coordinator.finish(first!)

    const retry = coordinator.begin('client-1')
    expect(retry).not.toBeNull()
    coordinator.finish(retry!)
    expect(coordinator.isLoading('client-1')).toBe(false)
  })

  it('refuses two concurrent attempts for the same user', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.switchUser('client-1')
    expect(coordinator.begin('client-1')).not.toBeNull()
    expect(coordinator.begin('client-1')).toBeNull()
  })

  it('invalidates an old response after an identity change', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.switchUser('client-1')
    const oldRequest = coordinator.begin('client-1')!
    coordinator.switchUser('client-2')
    expect(coordinator.isCurrent(oldRequest)).toBe(false)
    expect(coordinator.begin('client-1')).toBeNull()
    expect(coordinator.begin('client-2')).not.toBeNull()
  })

  it('ignores a response received after unmount', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.switchUser('client-1')
    const request = coordinator.begin('client-1')!
    coordinator.unmount()
    expect(coordinator.isCurrent(request)).toBe(false)
    expect(coordinator.begin('client-1')).toBeNull()
  })

  it('supports the Strict Mode setup-cleanup-setup cycle without reviving stale work', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.mount()
    coordinator.switchUser('client-1')
    const staleRequest = coordinator.begin('client-1')!

    coordinator.unmount()
    coordinator.mount()

    expect(coordinator.isCurrent(staleRequest)).toBe(false)
    const remountedRequest = coordinator.begin('client-1')
    expect(remountedRequest).not.toBeNull()
    expect(coordinator.begin('client-1')).toBeNull()
    coordinator.finish(remountedRequest!)
    expect(coordinator.isLoading('client-1')).toBe(false)
  })

  it('keeps a previous identity response stale after remount and user change', () => {
    const coordinator = new ProfileLoadCoordinator()
    coordinator.switchUser('client-1')
    const oldRequest = coordinator.begin('client-1')!

    coordinator.unmount()
    coordinator.mount()
    coordinator.switchUser('client-2')

    expect(coordinator.isCurrent(oldRequest)).toBe(false)
    expect(coordinator.begin('client-1')).toBeNull()
    expect(coordinator.begin('client-2')).not.toBeNull()
  })
})
