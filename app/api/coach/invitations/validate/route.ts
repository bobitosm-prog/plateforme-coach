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
    .select('status,expires_at')
    .eq('token_hash', hashCoachInvitationToken(parsed.data.token))
    .maybeSingle()

  if (error || !data || data.status !== 'pending' || Date.parse(data.expires_at) <= Date.now()) {
    return invitationFailure('INVITATION_INVALID')
  }

  return NextResponse.json({ success: true, data: { valid: true, expiresAt: data.expires_at } })
}
