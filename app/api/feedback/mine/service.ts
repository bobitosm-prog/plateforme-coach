import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import type { ApiErrorCode } from '@/lib/api/errors'

const FEEDBACK_PROJECTION = `
  id, type, title, description, status, priority,
  screenshot_url, page_url,
  created_at, updated_at
` as const

export type MyFeedbackServiceResult =
  | { ok: true; reports: Record<string, unknown>[]; count: number; unreadCount: number }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'PERSISTENCE_FAILED' | 'INTERNAL_ERROR'>; internalMessage?: string }

export async function readMyFeedback(): Promise<MyFeedbackServiceResult> {
  try {
    const supabase = await createSupabaseRouteClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
    const { data, error } = await supabase
      .from('bug_reports')
      .select(FEEDBACK_PROJECTION)
      .eq('user_id', identity.data.id)
      .order('created_at', { ascending: false })
    if (error) return { ok: false, code: 'PERSISTENCE_FAILED', internalMessage: error.message }
    const reports = (data ?? []).map(report => ({
      ...report,
      admin_reply: null,
      replied_at: null,
      replied_by: null,
      read_by_user: null,
    }))
    return { ok: true, reports, count: reports.length, unreadCount: 0 }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
