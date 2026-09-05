export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { revokeCoachInvitationSchema } from '@/lib/coach-invitations/create'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

type RevokeResult = { success?: boolean; code?: unknown; invitationId?: unknown }

function failure(code: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Invitation unavailable' } },
    { status },
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failure('AUTH_REQUIRED', 401)

  const parsed = revokeCoachInvitationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return failure('INVITATION_INVALID', 400)

  const { data, error } = await supabase.rpc('revoke_coach_invitation_v2', {
    p_invitation_id: parsed.data.invitationId,
  })
  if (error) return failure('INVITATION_REVOCATION_FAILED', 500)

  const result = (data ?? {}) as RevokeResult
  if (result.success === true) {
    return NextResponse.json({
      success: true,
      data: { invitationId: result.invitationId, status: 'revoked' },
    })
  }
  if (result.code === 'INVITATION_NOT_FOUND') return failure('INVITATION_NOT_FOUND', 404)
  if (result.code === 'INVITATION_TERMINAL') return failure('INVITATION_TERMINAL', 409)
  if (result.code === 'COACH_REQUIRED') return failure('COACH_REQUIRED', 403)
  return failure('INVITATION_REVOCATION_FAILED', 500)
}
