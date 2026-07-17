import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import type { ApiErrorCode } from '@/lib/api/errors'

export type MarkFeedbackReadServiceResult =
  | { ok: true; markedCount: number }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'PERSISTENCE_FAILED' | 'INTERNAL_ERROR'>; internalMessage?: string }

export async function markMyFeedbackRead(): Promise<MarkFeedbackReadServiceResult> {
  try {
    const supabase = await createSupabaseRouteClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
    const { data, error } = await supabase
      .from('bug_reports')
      .update({ read_by_user: true })
      .eq('user_id', identity.data.id)
      .eq('read_by_user', false)
      .not('admin_reply', 'is', null)
      .select('id')
    if (error) return { ok: false, code: 'PERSISTENCE_FAILED', internalMessage: error.message }
    return { ok: true, markedCount: data?.length ?? 0 }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
