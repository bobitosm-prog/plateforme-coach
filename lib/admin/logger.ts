import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminActionLog } from './types'

/**
 * Log une action admin dans la table app_logs.
 * Best-effort : si l'insert échoue, log en console mais ne casse pas l'action.
 *
 * Colonnes app_logs existantes : level, message, details, user_id, user_email, page_url
 */
export async function logAdminAction(payload: AdminActionLog): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('app_logs').insert({
      level: 'admin_action',
      message: `[${payload.action}] ${payload.actor_email} → ${payload.target_email}`,
      user_id: payload.target_user_id,
      user_email: payload.actor_email,
      details: {
        action: payload.action,
        actor_email: payload.actor_email,
        target_email: payload.target_email,
        ...payload.metadata,
      },
    })

    if (error) {
      console.error('[admin-logger] Failed to log action:', error.message)
    }
  } catch (err) {
    console.error('[admin-logger] Exception:', err)
  }
}
