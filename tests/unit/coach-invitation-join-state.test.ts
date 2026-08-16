import { describe, expect, it } from 'vitest'

import { invitationTerminalState } from '../../app/join/invitation-state'

describe('/join invitation persistence dual-read', () => {
  it.each(['INVITATION_CONSUMPTION_FAILED', 'PERSISTENCE_FAILED'])(
    'maps %s to the existing temporary state',
    code => {
      expect(invitationTerminalState(code)).toBe('temporary')
    },
  )

  it('keeps an unknown code on the historical invalid fallback', () => {
    expect(invitationTerminalState('UNKNOWN_INVITATION_ERROR')).toBe('invalid')
  })

  it('keeps existing terminal invitation mappings unchanged', () => {
    expect(invitationTerminalState('INVITATION_EXPIRED')).toBe('expired')
    expect(invitationTerminalState('INVITATION_REVOKED')).toBe('revoked')
    expect(invitationTerminalState('INVITATION_ALREADY_USED')).toBe('used')
    expect(invitationTerminalState('INVITATION_EMAIL_MISMATCH')).toBe('forbidden')
    expect(invitationTerminalState('INVITATION_EMAIL_UNVERIFIED')).toBe('forbidden')
  })
})
