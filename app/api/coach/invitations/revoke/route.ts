import { NextResponse } from 'next/server'
import { revokeCoachInvitationSchema } from '@/lib/coach-invitations/create'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSecurityAudit } from '@/lib/security/audit-log'

function failure(code: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Invitation unavailable' } },
    { status },
  )
}

export async function POST(request: Request) {
  const audit = createSecurityAudit(request)
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return audit.reject(failure('AUTH_REQUIRED', 401), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'revoke', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })

  const parsed = revokeCoachInvitationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return failure('INVITATION_INVALID', 400)

  const { data: invitation, error: readError } = await supabase
    .from('coach_invitations')
    .select('id,coach_id,status')
    .eq('id', parsed.data.invitationId)
    .maybeSingle()
  if (readError) return failure('INVITATION_REVOCATION_FAILED', 500)
  if (!invitation || invitation.coach_id !== user.id) return audit.reject(failure('INVITATION_NOT_FOUND', 404), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'revoke', outcome: 'rejected', reason: 'RELATION_FORBIDDEN', status: 404 })
  if (invitation.status !== 'pending') return audit.reject(failure('INVITATION_TERMINAL', 409), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'revoke', outcome: 'rejected', reason: 'INVITATION_TERMINAL', status: 409 })

  const { data: revoked, error: updateError } = await supabase
    .from('coach_invitations')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq('id', invitation.id)
    .eq('coach_id', user.id)
    .select('id,status')
    .maybeSingle()
  if (updateError || !revoked) return failure('INVITATION_REVOCATION_FAILED', 500)

  return NextResponse.json({ success: true, data: { invitationId: revoked.id, status: revoked.status } })
}
