export type InvitationTerminalState =
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'used'
  | 'forbidden'
  | 'temporary'

export function invitationTerminalState(code?: string): InvitationTerminalState {
  if (code === 'INVITATION_EXPIRED') return 'expired'
  if (code === 'INVITATION_REVOKED') return 'revoked'
  if (code === 'INVITATION_ALREADY_USED') return 'used'
  if (
    code === 'INVITATION_EMAIL_MISMATCH'
    || code === 'INVITATION_EMAIL_UNVERIFIED'
    || code === 'INVITATION_ACTIVE_COACH_CONFLICT'
  ) return 'forbidden'
  if (code === 'INVITATION_CONSUMPTION_FAILED' || code === 'PERSISTENCE_FAILED') {
    return 'temporary'
  }
  return 'invalid'
}
