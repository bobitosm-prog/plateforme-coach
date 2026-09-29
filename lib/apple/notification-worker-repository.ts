import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AppleEnvironment } from './transaction-verification'
import type { AppleReconciliation } from './reconciliation'

export interface ClaimedAppleNotification {
  environment: AppleEnvironment
  notificationId: string
  leaseToken: string
  signedPayload: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function claimAppleNotification(environment: AppleEnvironment): Promise<ClaimedAppleNotification | null> {
  const { data, error } = await supabaseAdmin.rpc('claim_apple_notification', { p_environment: environment })
  if (error || !Array.isArray(data) || data.length > 1) throw new Error('APPLE_QUEUE_UNAVAILABLE')
  if (data.length === 0) return null
  const row = data[0]
  if (row.environment !== environment || typeof row.notification_id !== 'string' || !UUID.test(row.notification_id) ||
      typeof row.lease_token !== 'string' || !UUID.test(row.lease_token) || typeof row.signed_payload !== 'string') {
    throw new Error('APPLE_QUEUE_INVALID_RESULT')
  }
  return { environment, notificationId: row.notification_id, leaseToken: row.lease_token, signedPayload: row.signed_payload }
}
export async function findAppleBindingUser(environment: AppleEnvironment, token: string): Promise<string | null> {
  if (!UUID.test(token)) return null
  const { data, error } = await supabaseAdmin.from('apple_account_bindings').select('user_id')
    .eq('environment', environment).eq('app_account_token', token).maybeSingle()
  if (error) throw new Error('APPLE_BINDING_UNAVAILABLE')
  if (!data || data.user_id === null) return null
  if (typeof data.user_id !== 'string' || !UUID.test(data.user_id)) throw new Error('APPLE_BINDING_UNAVAILABLE')
  return data.user_id
}
export async function completeAppleNotification(event: ClaimedAppleNotification, userId: string,
  observation: AppleReconciliation): Promise<'processed' | 'stale'> {
  const { data, error } = await supabaseAdmin.rpc('complete_apple_notification', {
    p_environment: event.environment, p_notification_id: event.notificationId,
    p_lease_token: event.leaseToken, p_user_id: userId, p_observation: observation,
  })
  if (error || (data !== 'processed' && data !== 'stale')) throw new Error('APPLE_COMPLETION_UNAVAILABLE')
  return data
}
export async function failAppleNotification(event: ClaimedAppleNotification, retry: boolean, code: string): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc('fail_apple_notification', {
    p_environment: event.environment, p_notification_id: event.notificationId,
    p_lease_token: event.leaseToken, p_retry: retry, p_error_code: code,
  })
  // false means the lease was lost: its current owner will finish or reclaim it.
  if (error || typeof data !== 'boolean') throw new Error('APPLE_QUEUE_UNAVAILABLE')
}
