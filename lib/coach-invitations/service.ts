import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  COACH_INVITATION_EXPIRATION_MS,
  createCoachInvitationToken,
  renderCoachInvitationEmail,
} from './create'
import { hashCoachInvitationToken } from './token'

export type InvitationServiceResult =
  | { ok: true; invitationId: string; expiresAt: string; deliveryStatus: string }
  | { ok: false; code: string; status: number; retryAfter?: number; invitationId?: string }

export async function createAndDeliverCoachInvitation(input: {
  coachId: string
  coachName: string
  recipientEmail: string
  locale?: string
  ip: string
  appUrl: string
}): Promise<InvitationServiceResult> {
  const coachName = input.coachName.replace(/[\r\n]+/g, ' ').trim() || 'Ton coach'
  const localLimit = checkRateLimit(`coach-invitation:${input.coachId}:${input.ip}`, 10, 60 * 60 * 1000)
  if (!localLimit.allowed) return { ok: false, code: 'INVITATION_RATE_LIMITED', status: 429, retryAfter: localLimit.retryAfter ?? 3600 }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { ok: false, code: 'INVITATION_CREATION_FAILED', status: 500 }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ count: coachCount, error: coachCountError }, { count: recipientCount, error: recipientCountError }] = await Promise.all([
    admin.from('coach_invitations').select('id', { count: 'exact', head: true }).eq('coach_id', input.coachId).gte('created_at', oneHourAgo),
    admin.from('coach_invitations').select('id', { count: 'exact', head: true }).eq('coach_id', input.coachId).eq('recipient_email', input.recipientEmail).gte('created_at', oneDayAgo),
  ])
  if (coachCountError || recipientCountError) return { ok: false, code: 'INVITATION_CREATION_FAILED', status: 500 }
  if ((coachCount ?? 0) >= 10 || (recipientCount ?? 0) >= 3) return { ok: false, code: 'INVITATION_RATE_LIMITED', status: 429, retryAfter: 3600 }

  const { data: duplicate, error: duplicateError } = await admin.from('coach_invitations').select('id')
    .eq('coach_id', input.coachId).eq('recipient_email', input.recipientEmail).eq('status', 'pending')
    .gte('expires_at', new Date().toISOString()).limit(1)
  if (duplicateError) return { ok: false, code: 'INVITATION_CREATION_FAILED', status: 500 }
  if (duplicate?.length) return { ok: false, code: 'INVITATION_ALREADY_PENDING', status: 409 }

  const token = createCoachInvitationToken()
  const expiresAt = new Date(Date.now() + COACH_INVITATION_EXPIRATION_MS).toISOString()
  const { data: invitation, error: insertError } = await admin.from('coach_invitations').insert({
    coach_id: input.coachId,
    recipient_email: input.recipientEmail,
    token_hash: hashCoachInvitationToken(token),
    expires_at: expiresAt,
    metadata: { ...(input.locale ? { locale: input.locale } : {}), source: 'coach_dashboard' },
    delivery_status: 'pending',
  }).select('id,expires_at').single()
  if (insertError || !invitation) {
    return { ok: false, code: insertError?.code === '23505' ? 'INVITATION_ALREADY_PENDING' : 'INVITATION_CREATION_FAILED', status: insertError?.code === '23505' ? 409 : 500 }
  }

  const joinUrl = `${input.appUrl.replace(/\/$/, '')}/join?token=${token}`
  const delivery = await sendEmail({
    to: input.recipientEmail,
    subject: `${coachName} t'invite sur MoovX`,
    html: renderCoachInvitationEmail({ coachName, joinUrl }),
  })
  const deliveryStatus = delivery.method === 'sent' ? 'sent' : delivery.method === 'skipped' ? 'skipped' : 'failed'
  await admin.from('coach_invitations').update({ delivery_status: deliveryStatus, delivery_attempted_at: new Date().toISOString() }).eq('id', invitation.id)
  if (!delivery.success) return { ok: false, code: 'INVITATION_DELIVERY_FAILED', status: 502, invitationId: invitation.id }
  return { ok: true, invitationId: invitation.id, expiresAt: invitation.expires_at, deliveryStatus }
}
