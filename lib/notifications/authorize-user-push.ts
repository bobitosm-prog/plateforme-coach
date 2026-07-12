import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const userPushRequestSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  url: z.string().min(1).max(2048).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
}).strict()

export type UserPushRequest = z.infer<typeof userPushRequestSchema>

export type PushAuthorization =
  | { allowed: true }
  | { allowed: false; status: 403 | 500; reason: string }

export async function authorizeUserPush(
  supabaseAdmin: SupabaseClient,
  callerId: string,
  recipientId: string
): Promise<PushAuthorization> {
  if (callerId === recipientId) {
    return { allowed: false, status: 403, reason: 'Self notification is not allowed' }
  }

  const { data: caller, error: callerError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()
  if (callerError) return { allowed: false, status: 500, reason: 'Caller lookup failed' }
  if (!caller || !['coach', 'client'].includes(caller.role)) {
    return { allowed: false, status: 403, reason: 'Caller role is not allowed' }
  }

  const { data: recipient, error: recipientError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', recipientId)
    .maybeSingle()
  if (recipientError) return { allowed: false, status: 500, reason: 'Recipient lookup failed' }
  if (!recipient) {
    return { allowed: false, status: 403, reason: 'Notification is not allowed' }
  }

  const coachToClient = caller.role === 'coach' && recipient.role === 'client'
  const clientToCoach = caller.role === 'client' && recipient.role === 'coach'
  if (!coachToClient && !clientToCoach) {
    return { allowed: false, status: 403, reason: 'Role pairing is not allowed' }
  }

  const coachId = coachToClient ? callerId : recipientId
  const clientId = coachToClient ? recipientId : callerId
  const { data: relation, error: relationError } = await supabaseAdmin
    .from('coach_clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  if (relationError) return { allowed: false, status: 500, reason: 'Relation lookup failed' }
  if (!relation) return { allowed: false, status: 403, reason: 'Active relation required' }

  return { allowed: true }
}
