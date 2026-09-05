export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { invitationFailure } from '@/lib/coach-invitations/http'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const parsed = coachInvitationBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVITATION_INVALID', message: 'Invalid request' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('coach_invitations')
    .select('status,expires_at,recipient_email')
    .eq('token_hash', hashCoachInvitationToken(parsed.data.token))
    .maybeSingle()

  if (error || !data) {
    return invitationFailure('INVITATION_INVALID')
  }

  if (data.status === 'revoked') return invitationFailure('INVITATION_REVOKED')
  if (data.status === 'consumed') return invitationFailure('INVITATION_ALREADY_USED')
  if (data.status !== 'pending') return invitationFailure('INVITATION_INVALID')
  if (Date.parse(data.expires_at) <= Date.now()) return invitationFailure('INVITATION_EXPIRED')

  const [localPart = '', domain = ''] = data.recipient_email.split('@')
  const maskedLocal = localPart.length <= 2
    ? `${localPart.slice(0, 1)}*`
    : `${localPart.slice(0, 2)}${'*'.repeat(Math.min(6, localPart.length - 2))}`
  const maskedEmail = domain ? `${maskedLocal}@${domain}` : maskedLocal

  return NextResponse.json({
    success: true,
    data: { valid: true, expiresAt: data.expires_at, maskedEmail },
  })
}
