export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { invitationFailure, isInvitationErrorCode } from '@/lib/coach-invitations/http'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

type RpcResult = { success?: boolean; code?: unknown; relationOutcome?: unknown }

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  const parsed = coachInvitationBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVITATION_INVALID', message: 'Invalid request' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.rpc('consume_coach_invitation_v2', {
    p_token_hash: hashCoachInvitationToken(parsed.data.token),
  })
  if (error) return invitationFailure('PERSISTENCE_FAILED')

  const result = (data ?? {}) as RpcResult
  if (result.success === true) {
    return NextResponse.json({
      success: true,
      data: { redirectTo: '/', relationOutcome: result.relationOutcome },
    })
  }

  const code = isInvitationErrorCode(result.code) ? result.code : 'PERSISTENCE_FAILED'
  return invitationFailure(code)
}
