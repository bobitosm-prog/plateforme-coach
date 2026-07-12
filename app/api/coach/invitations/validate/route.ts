import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { coachInvitationBodySchema, hashCoachInvitationToken } from '@/lib/coach-invitations/token'
import { invitationFailure } from '@/lib/coach-invitations/http'

export async function POST(request: Request) {
  const parsed = coachInvitationBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVITATION_INVALID', message: 'Invalid request' } },
      { status: 400 },
    )
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
    return invitationFailure('INVITATION_INVALID')
  }

  return NextResponse.json({ success: true, data: { valid: true, expiresAt: data.expires_at } })
}
