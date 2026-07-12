import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { invitationFailure, isInvitationErrorCode } from '@/lib/coach-invitations/http'

type RpcResult = { success?: boolean; code?: unknown; coachId?: unknown }

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

  const tokenHash = hashCoachInvitationToken(parsed.data.token)
  const { data, error } = await supabase.rpc('consume_coach_invitation', {
    p_token_hash: tokenHash,
  })
  if (error) return invitationFailure('INVITATION_CONSUMPTION_FAILED')

  const result = (data ?? {}) as RpcResult
  if (result.success === true) {
    return NextResponse.json({ success: true, data: { redirectTo: '/' } })
  }
  return invitationFailure(
    isInvitationErrorCode(result.code) ? result.code : 'INVITATION_CONSUMPTION_FAILED',
  )
}
