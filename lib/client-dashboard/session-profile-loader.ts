import type { IdentityRepository } from '@/lib/repositories/identity'
import type { ProfileRepository, ProfileSummary } from '@/lib/repositories/profile'
import {
  decideProfileRead,
  isDashboardCacheOwnedBy,
  ProfileLoadCoordinator,
  type DashboardCacheValue,
  type ProfileLoadRequest,
} from '@/lib/client-dashboard/profile-load-state'

export interface DashboardCacheStore {
  get(key: string): unknown
  remove(key: string): void
}

export type SessionProfileLoadResult =
  | { kind: 'cache'; cached: DashboardCacheValue }
  | { kind: 'profile'; profile: ProfileSummary }
  | { kind: 'retained' }
  | { kind: 'not_found' }
  | { kind: 'anonymous' }
  | { kind: 'error' }
  | { kind: 'stale' }

export interface SessionProfileLoadOperation {
  load(options: { forceRefresh: boolean; hasConfirmedProfile: boolean }): Promise<SessionProfileLoadResult>
  isCurrent(): boolean
  finish(): void
}

interface SessionProfileLoaderDependencies {
  identityRepository: Pick<IdentityRepository, 'getCurrent'>
  profileRepository: Pick<ProfileRepository, 'findById'>
  cache: DashboardCacheStore
  coordinator?: ProfileLoadCoordinator
}

export function createSessionProfileLoader({
  identityRepository,
  profileRepository,
  cache,
  coordinator = new ProfileLoadCoordinator(),
}: SessionProfileLoaderDependencies) {
  function operationFor(userId: string, request: ProfileLoadRequest): SessionProfileLoadOperation {
    const isCurrent = () => coordinator.isCurrent(request)

    return {
      async load({ forceRefresh, hasConfirmedProfile }) {
        const identity = await identityRepository.getCurrent()
        if (!isCurrent()) return { kind: 'stale' }
        if (!identity.ok) return identity.kind === 'anonymous' ? { kind: 'anonymous' } : { kind: 'error' }
        if (identity.data.id !== userId) return { kind: 'stale' }

        if (!forceRefresh) {
          const cacheKey = `dashboard_${userId}`
          const cached = cache.get(cacheKey)
          if (isDashboardCacheOwnedBy(cached, userId)) return { kind: 'cache', cached }
          if (cached) cache.remove(cacheKey)
        }

        const profile = await profileRepository.findById(userId)
        if (!isCurrent()) return { kind: 'stale' }
        const decision = decideProfileRead(profile, hasConfirmedProfile)
        if (profile.ok) return { kind: 'profile', profile: profile.data }
        if (decision.status === 'ready') return { kind: 'retained' }
        if (decision.status === 'not_found') return { kind: 'not_found' }
        return { kind: 'error' }
      },
      isCurrent,
      finish: () => coordinator.finish(request),
    }
  }

  return {
    mount: () => coordinator.mount(),
    unmount: () => coordinator.unmount(),
    switchUser: (userId: string | null) => coordinator.switchUser(userId),
    isLoading: (userId: string) => coordinator.isLoading(userId),
    begin(userId: string): SessionProfileLoadOperation | null {
      const request = coordinator.begin(userId)
      return request ? operationFor(userId, request) : null
    },
  }
}

export type SessionProfileLoader = ReturnType<typeof createSessionProfileLoader>
