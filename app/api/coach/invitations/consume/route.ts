import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { invitationFailure, isInvitationErrorCode } from '@/lib/coach-invitations/http'
import { createSecurityAudit } from '@/lib/security/audit-log'

type RpcResult = { success?: boolean; code?: unknown; coachId?: unknown }

export async function POST(request: Request) {
  const audit = createSecurityAudit(request)
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return audit.reject(NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 },
    ), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'consume', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })
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
  if (error) {
    const response = invitationFailure('INVITATION_CONSUMPTION_FAILED')
    return audit.reject(response, { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'consume', outcome: 'failed', reason: 'INVITATION_CONSUMPTION_FAILED', status: response.status })
  }

  const result = (data ?? {}) as RpcResult
  if (result.success === true) {
    return NextResponse.json({ success: true, data: { redirectTo: '/' } })
  }
  const reason = isInvitationErrorCode(result.code) ? result.code : 'INVITATION_CONSUMPTION_FAILED'
  const response = invitationFailure(reason)
  return audit.reject(response, { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'consume', outcome: response.status >= 500 ? 'failed' : 'rejected', reason, status: response.status })
}
