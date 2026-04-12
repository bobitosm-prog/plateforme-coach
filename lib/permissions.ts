/**
 * Client permission helpers
 *
 * TYPE 1 — CLIENT DIRECT: pays MoovX, full AI access
 * TYPE 2 — CLIENT INVITÉ: invited by coach, AI disabled, coach manages plans
 */

/** Check if user can use AI features (generate programs, nutrition, chat AI) */
export function canUseAI(profile: any): boolean {
  if (!profile) return false
  // Invited clients cannot use AI — their coach manages everything
  if (profile.subscription_type === 'invited') return false
  return true
}

/** Check if user is an invited client (coach-managed) */
export function isInvitedClient(profile: any): boolean {
  return profile?.subscription_type === 'invited'
}

/** Message to show when AI is disabled for invited clients */
export const AI_DISABLED_MESSAGE = 'Ton coach gère ton programme et ta nutrition. Contacte-le directement via la messagerie.'
export const AI_DISABLED_TITLE = 'Fonctionnalité réservée'
