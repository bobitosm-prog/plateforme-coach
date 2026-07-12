import { NextResponse } from 'next/server'

export type InvitationErrorCode =
  | 'INVITATION_INVALID'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'INVITATION_EMAIL_UNVERIFIED'
  | 'INVITATION_COACH_INVALID'
  | 'INVITATION_RECIPIENT_INELIGIBLE'
  | 'INVITATION_ALREADY_LINKED'
  | 'INVITATION_CONSUMPTION_FAILED'

const statusByCode: Record<InvitationErrorCode, number> = {
  INVITATION_INVALID: 404,
  INVITATION_EXPIRED: 410,
  INVITATION_ALREADY_USED: 409,
  INVITATION_REVOKED: 410,
  INVITATION_EMAIL_MISMATCH: 403,
  INVITATION_EMAIL_UNVERIFIED: 403,
  INVITATION_COACH_INVALID: 403,
  INVITATION_RECIPIENT_INELIGIBLE: 409,
  INVITATION_ALREADY_LINKED: 409,
  INVITATION_CONSUMPTION_FAILED: 500,
}

export function invitationFailure(code: InvitationErrorCode) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Invitation unavailable' } },
    { status: statusByCode[code] },
  )
}

export function isInvitationErrorCode(value: unknown): value is InvitationErrorCode {
  return typeof value === 'string' && value in statusByCode
}
