import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { invitationFailure } from '@/lib/coach-invitations/http'
import { createSecurityAudit } from '@/lib/security/audit-log'

export async function POST(request: Request) {
  const audit = createSecurityAudit(request)
  const parsed = coachInvitationBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return audit.reject(NextResponse.json(
      { success: false, error: { code: 'INVITATION_INVALID', message: 'Invalid request' } },
      { status: 400 },
    ), { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'validate', outcome: 'rejected', reason: 'INVITATION_INVALID', status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return invitationFailure('INVITATION_CONSUMPTION_FAILED')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const tokenHash = hashCoachInvitationToken(parsed.data.token)
  const { data, error } = await supabase
    .from('coach_invitations')
    .select('status,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !data || data.status !== 'pending' || Date.parse(data.expires_at) <= Date.now()) {
    const response = invitationFailure('INVITATION_INVALID')
    return audit.reject(response, { event: 'COACH_INVITATION_REJECTED', domain: 'coach_invitations', operation: 'validate', outcome: 'rejected', reason: 'INVITATION_INVALID', status: response.status })
  }

  return NextResponse.json({ success: true, data: { valid: true, expiresAt: data.expires_at } })
}
