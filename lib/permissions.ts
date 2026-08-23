/**
 * Client permission helpers
 *
 * TYPE 1 — CLIENT DIRECT: pays MoovX, full AI access
 * TYPE 2 — CLIENT INVITÉ: invited by coach, AI disabled, coach manages plans
 */

import { resolveUserCapabilities } from './entitlements/capabilities'

type CapabilityProfile = {
  subscription_type?: string | null
}

/** Check if user can use AI features (generate programs, nutrition, chat AI) */
export function canUseAI(profile: CapabilityProfile | null | undefined): boolean {
  if (!profile) return false
  return resolveUserCapabilities({
    subscriptionType: profile.subscription_type,
  }).ai
}

/** Check if user is an invited client (coach-managed) */
export function isInvitedClient(profile: CapabilityProfile | null | undefined): boolean {
  return resolveUserCapabilities({
    subscriptionType: profile?.subscription_type,
  }).coachManaged
}

/** Message to show when AI is disabled for invited clients */
export const AI_DISABLED_MESSAGE = 'Ton coach gère ton programme et ta nutrition. Contacte-le directement via la messagerie.'
export const AI_DISABLED_TITLE = 'Fonctionnalité réservée'
