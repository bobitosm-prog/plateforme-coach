export type UserCapabilities = {
  ai: boolean
  training: boolean
  nutrition: boolean
  coachManaged: boolean
}

type CapabilitySource = {
  subscriptionType: string | null | undefined
}

/**
 * Resolves the current product capabilities from the legacy subscription
 * authority. This intentionally preserves existing rights while consumers
 * migrate behind one boundary.
 */
export function resolveUserCapabilities({
  subscriptionType,
}: CapabilitySource): UserCapabilities {
  const coachManaged = subscriptionType === 'invited'

  return {
    ai: !coachManaged,
    training: !coachManaged,
    nutrition: !coachManaged,
    coachManaged,
  }
}
