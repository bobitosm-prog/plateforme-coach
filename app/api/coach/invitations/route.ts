export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  createCoachInvitationSchema,
  normalizeCoachInvitationEmail,
} from '@/lib/coach-invitations/create'
import { createAndDeliverCoachInvitation } from '@/lib/coach-invitations/service'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

function failure(code: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Invitation unavailable' } },
    { status, headers },
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return failure('AUTH_REQUIRED', 401)

  const parsed = createCoachInvitationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return failure('INVITATION_INVALID', 400)

  const { data: coach, error: coachError } = await supabase
    .from('profiles')
    .select('role,full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (coachError) return failure('INVITATION_CREATION_FAILED', 500)
  if (coach?.role !== 'coach') return failure('COACH_REQUIRED', 403)

  const result = await createAndDeliverCoachInvitation({
    coachId: user.id,
    coachName: coach.full_name || 'Ton coach',
    recipientEmail: normalizeCoachInvitationEmail(parsed.data.recipientEmail),
    locale: parsed.data.locale,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
  })
  if (!result.ok) {
    const headers = result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined
    if (result.code === 'INVITATION_DELIVERY_FAILED') {
      return NextResponse.json(
        {
          success: false,
          error: { code: result.code, message: 'Invitation delivery failed' },
          data: { invitationId: result.invitationId },
        },
        { status: result.status },
      )
    }
    return failure(result.code, result.status, headers)
  }

  return NextResponse.json({
    success: true,
    data: {
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      deliveryStatus: result.deliveryStatus,
    },
  }, { status: 201 })
}
