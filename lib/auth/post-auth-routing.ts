export const LEGACY_ONBOARDING_MIGRATION_DATE = '2026-05-27T00:00:00.000Z'
export const LEGACY_PHOTO_FEATURE_DATE = '2026-04-03T00:00:00.000Z'

export const POST_AUTH_PROFILE_SELECT = 'email,role,onboarding_completed,onboarding_completed_at,coach_onboarding_complete,full_name,onboarding_photo_completed_at,objective,created_at' as const

export type ProfileState = 'loading' | 'ready' | 'missing' | 'error'

export interface PostAuthProfile {
  email?: string | null
  role?: string | null
  onboarding_completed?: boolean | null
  onboarding_completed_at?: string | null
  coach_onboarding_complete?: boolean | null
  full_name?: string | null
  onboarding_photo_completed_at?: string | null
  objective?: string | null
  created_at?: string | null
}

export type PostAuthDestination =
  | 'login'
  | 'join'
  | 'client_app'
  | 'coach_app'
  | 'client_onboarding_v2'
  | 'client_onboarding_fitness'
  | 'client_onboarding_profile'
  | 'client_onboarding_photo'
  | 'coach_onboarding'
  | 'profile_missing'
  | 'profile_error'
  | 'role_missing'

export interface PostAuthDecision {
  destination: PostAuthDestination
  route: string | null
}

export function classifyProfileResult<T>(result: { data: T | null; error?: { code?: string } | null }): {
  state: Exclude<ProfileState, 'loading'>
  profile: T | null
} {
  if (result.error && result.error.code !== 'PGRST116') return { state: 'error', profile: null }
  if (!result.data) return { state: 'missing', profile: null }
  return { state: 'ready', profile: result.data }
}

function clientOnboardingDestination(profile: PostAuthProfile): PostAuthDecision {
  if (profile.onboarding_completed === true) return { destination: 'client_app', route: '/' }

  const createdAt = profile.created_at ? new Date(profile.created_at) : null
  const isLegacy = Boolean(createdAt && createdAt < new Date(LEGACY_ONBOARDING_MIGRATION_DATE))
  if (!isLegacy) return { destination: 'client_onboarding_v2', route: '/onboarding-v2' }

  if (!profile.onboarding_completed_at && !profile.objective) {
    return { destination: 'client_onboarding_fitness', route: '/onboarding-fitness' }
  }

  const fullName = profile.full_name?.trim()
  if (!fullName || fullName === 'Athlete') {
    return { destination: 'client_onboarding_profile', route: '/onboarding' }
  }

  const photoApplies = Boolean(createdAt && createdAt >= new Date(LEGACY_PHOTO_FEATURE_DATE))
  if (photoApplies && !profile.onboarding_photo_completed_at) {
    return { destination: 'client_onboarding_photo', route: '/onboarding-photo' }
  }

  return { destination: 'client_app', route: '/' }
}

export function resolvePostAuthDestination(input: {
  authenticated: boolean
  profileState: ProfileState
  profile?: PostAuthProfile | null
  joinIntent?: boolean
  adminExempt?: boolean
}): PostAuthDecision {
  if (!input.authenticated) return { destination: 'login', route: '/login' }
  if (input.joinIntent) return { destination: 'join', route: '/join' }
  if (input.profileState === 'missing') return { destination: 'profile_missing', route: null }
  if (input.profileState === 'error' || input.profileState === 'loading') {
    return { destination: 'profile_error', route: null }
  }

  const profile = input.profile
  if (!profile?.role) return { destination: 'role_missing', route: null }
  if (input.adminExempt || profile.role === 'super_admin') return { destination: 'client_app', route: '/' }
  if (profile.role === 'coach') {
    return profile.coach_onboarding_complete === true
      ? { destination: 'coach_app', route: '/' }
      : { destination: 'coach_onboarding', route: '/onboarding-coach' }
  }
  if (profile.role === 'client') return clientOnboardingDestination(profile)
  return { destination: 'role_missing', route: null }
}
