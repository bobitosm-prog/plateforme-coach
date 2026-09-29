import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { VerifiedAppleNotification } from './notification-verification'

export async function enqueueAppleNotification(event: VerifiedAppleNotification): Promise<'inserted' | 'duplicate'> {
  const { data, error } = await supabaseAdmin.rpc('enqueue_apple_notification', {
    p_environment: event.environment,
    p_notification_id: event.notificationId,
    p_notification_type: event.notificationType,
    p_subtype: event.subtype,
    p_signed_ms: event.signedDate,
    p_signed_payload: event.signedPayload,
  })
  if (error || (data !== 'inserted' && data !== 'duplicate')) throw new Error('APPLE_NOTIFICATION_ENQUEUE_FAILED')
  return data
}
