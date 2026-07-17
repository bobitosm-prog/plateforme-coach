import type { RepositoryResult } from '@/lib/repositories/result'

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'not_found' | 'error'

export type ProfileReadDecision =
  | { status: 'ready'; redirectToOnboarding: false }
  | { status: 'not_found'; redirectToOnboarding: true }
  | { status: 'error'; redirectToOnboarding: false }

export interface DashboardCacheValue {
  ownerUserId: string
  profileData: Record<string, unknown> & { id: string }
  weightsData?: unknown[]
  sessData?: unknown[]
  measureData?: unknown[]
  photosData?: unknown[]
  coachProgData?: Record<string, unknown> | null
  coachMealData?: unknown
  customProgData?: { days?: unknown[] } | null
  sessionDatesData?: Array<{ created_at: string }>
  hasTrainedBeforeVal?: boolean
}

export interface ProfileLoadRequest {
  readonly userId: string
  readonly version: number
}

export class ProfileLoadCoordinator {
  private mounted = true
  private activeUserId: string | null = null
  private version = 0
  private inFlight = false

  switchUser(userId: string | null): boolean {
    if (this.activeUserId === userId) return false
    this.activeUserId = userId
    this.version += 1
    this.inFlight = false
    return true
  }

  begin(userId: string): ProfileLoadRequest | null {
    if (!this.mounted || this.activeUserId !== userId || this.inFlight) return null
    this.inFlight = true
    this.version += 1
    return { userId, version: this.version }
  }

  isCurrent(request: ProfileLoadRequest): boolean {
    return this.mounted && this.inFlight && this.activeUserId === request.userId && this.version === request.version
  }

  finish(request: ProfileLoadRequest): void {
    if (this.isCurrent(request)) this.inFlight = false
  }

  isLoading(userId: string): boolean {
    return this.mounted && this.activeUserId === userId && this.inFlight
  }

  mount(): void {
    this.mounted = true
  }

  unmount(): void {
    this.mounted = false
    this.version += 1
    this.inFlight = false
  }
}

export function decideProfileRead<T>(
  result: RepositoryResult<T>,
  hasConfirmedProfile: boolean,
): ProfileReadDecision {
  if (result.ok) return { status: 'ready', redirectToOnboarding: false }
  if (result.kind === 'not_found') return { status: 'not_found', redirectToOnboarding: true }
  if (hasConfirmedProfile) return { status: 'ready', redirectToOnboarding: false }
  return { status: 'error', redirectToOnboarding: false }
}

export function isDashboardCacheOwnedBy(
  cached: unknown,
  userId: string,
): cached is DashboardCacheValue {
  if (!cached || typeof cached !== 'object') return false
  const value = cached as { ownerUserId?: unknown; profileData?: { id?: unknown } }
  return value.ownerUserId === userId && value.profileData?.id === userId
}
