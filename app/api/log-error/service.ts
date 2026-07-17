import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ClientLogInput } from './schema'
import type { ApiErrorCode } from '@/lib/api/errors'

const VALID_LEVELS = new Set(['info', 'warning', 'error', 'critical'])

export type ClientLogServiceResult =
  | { ok: true }
  | { ok: false; code: Extract<ApiErrorCode, 'INTERNAL_ERROR'> }

export function acceptClientLogRequest(ip: string): boolean {
  return checkRateLimit(`log-error:${ip}`, 10, 60_000).allowed
}

export async function persistClientLog(body: ClientLogInput): Promise<ClientLogServiceResult> {
  try {
    const level = typeof body.level === 'string' && VALID_LEVELS.has(body.level)
      ? body.level
      : 'error'
    const message = String(body.message).slice(0, 500)
    const pageUrl = body.page_url ? String(body.page_url).slice(0, 500) : null
    const details = body.details ? String(body.details).slice(0, 2_000) : null
    const supabase = await createSupabaseServerClient()
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const identity = await createIdentityRepository(supabase).getCurrent()
      if (identity.ok) {
        userId = identity.data.id
        userEmail = identity.data.email
      }
    } catch {}
    await supabase.from('app_logs').insert({
      level,
      message,
      details,
      user_id: userId,
      user_email: userEmail,
      page_url: pageUrl,
    })
    return { ok: true }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
