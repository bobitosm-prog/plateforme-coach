import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import {
  createCoachInvitationSchema,
  isValidCoachInvitationEmail,
  normalizeCoachInvitationEmail,
} from '@/lib/coach-invitations/create'
import { createAndDeliverCoachInvitation } from '@/lib/coach-invitations/service'
import { createSecurityAudit } from '@/lib/security/audit-log'

function failure(code: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Invitation unavailable' } },
    { status, headers },
  )
}

export async function POST(request: Request) {
  const audit = createSecurityAudit(request)
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return audit.reject(failure('AUTH_REQUIRED', 401), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'create', outcome: 'rejected', reason: 'AUTH_REQUIRED', status: 401 })

  const parsed = createCoachInvitationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return failure('INVITATION_INVALID', 400)

  const recipientEmail = normalizeCoachInvitationEmail(parsed.data.recipientEmail)
  if (!isValidCoachInvitationEmail(recipientEmail)) return failure('INVITATION_INVALID', 400)

  const { data: coach, error: coachError } = await supabase
    .from('profiles')
    .select('role,full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (coachError) return failure('INVITATION_CREATION_FAILED', 500)
  if (coach?.role !== 'coach') return audit.reject(failure('COACH_REQUIRED', 403), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'create', outcome: 'rejected', reason: 'ROLE_FORBIDDEN', status: 403 })

  const result = await createAndDeliverCoachInvitation({
    coachId: user.id,
    coachName: coach.full_name || 'Ton coach',
    recipientEmail,
    locale: parsed.data.locale,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
  })
  if (!result.ok) {
    const reason = result.code === 'INVITATION_RATE_LIMITED' ? 'RATE_LIMITED' : result.code
    if (result.retryAfter) return audit.reject(failure(result.code, result.status, { 'Retry-After': String(result.retryAfter) }), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'create', outcome: 'rejected', reason, status: result.status })
    if (result.code !== 'INVITATION_DELIVERY_FAILED') return audit.reject(failure(result.code, result.status), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'create', outcome: 'rejected', reason, status: result.status })
    return audit.reject(NextResponse.json(
      { success: false, error: { code: result.code, message: 'Invitation delivery failed' }, data: { invitationId: result.invitationId } },
      { status: 502 },
    ), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'create', outcome: 'failed', reason: 'INVITATION_DELIVERY_FAILED', status: 502 })
  }
  return NextResponse.json({
    success: true,
    data: { invitationId: result.invitationId, expiresAt: result.expiresAt, deliveryStatus: result.deliveryStatus },
  }, { status: 201 })
}
