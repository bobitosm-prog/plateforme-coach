export interface LegacySubscriptionFields {
  subscription_type: string | null
  subscription_status: string | null
  subscription_end_date: string | null
  trial_ends_at: string | null
}

export type LegacyRepositoryAccess = 'invited' | 'lifetime' | 'active' | 'inactive'
export type LegacyTrialState = 'active' | 'expired' | 'none' | 'invalid'

function future(value: string | null, now: Date): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > now.getTime()
}

export function resolveLegacyDashboardAccess(
  profile: Pick<LegacySubscriptionFields, 'subscription_type' | 'subscription_status' | 'subscription_end_date'>,
  now: Date,
): { allowed: boolean; source: 'invited' | 'lifetime' | 'beta' | 'active' | 'none' } {
  if (profile.subscription_type === 'lifetime') return { allowed: true, source: 'lifetime' }
  if (profile.subscription_type === 'invited') return { allowed: true, source: 'invited' }
  if (profile.subscription_type === 'beta') {
    return future(profile.subscription_end_date, now)
      ? { allowed: true, source: 'beta' }
      : { allowed: false, source: 'none' }
  }

  if (profile.subscription_status === 'lifetime') return { allowed: true, source: 'lifetime' }
  if (profile.subscription_status === 'invited') return { allowed: true, source: 'invited' }
  if (profile.subscription_status === 'beta') {
    return future(profile.subscription_end_date, now)
      ? { allowed: true, source: 'beta' }
      : { allowed: false, source: 'none' }
  }
  if (profile.subscription_status === 'active') {
    return !profile.subscription_end_date || future(profile.subscription_end_date, now)
      ? { allowed: true, source: 'active' }
      : { allowed: false, source: 'none' }
  }
  return { allowed: false, source: 'none' }
}

export function resolveLegacyRepositoryAccess(
  profile: LegacySubscriptionFields,
  now: Date,
): { access: LegacyRepositoryAccess; trial: LegacyTrialState } {
  let trial: LegacyTrialState = 'none'
  if (profile.trial_ends_at) {
    const timestamp = Date.parse(profile.trial_ends_at)
    trial = !Number.isFinite(timestamp) ? 'invalid' : timestamp > now.getTime() ? 'active' : 'expired'
  }

  const access = profile.subscription_type === 'invited' ? 'invited'
    : profile.subscription_type === 'lifetime' || profile.subscription_status === 'lifetime' ? 'lifetime'
      : profile.subscription_status === 'active' || trial === 'active' ? 'active' : 'inactive'

  return { access, trial }
}
