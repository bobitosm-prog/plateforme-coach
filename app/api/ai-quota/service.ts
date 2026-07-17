import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkAiQuota, checkRateLimit } from '@/lib/rate-limit'
import type { ApiErrorCode } from '@/lib/api/errors'

type AiQuotaErrorCode = Extract<ApiErrorCode, 'RATE_LIMITED' | 'AUTH_REQUIRED' | 'INTERNAL_ERROR'>

export type AiQuotaServiceResult =
  | { ok: true; data: { remaining: number; limit: number; resetIn: number; days: number } }
  | { ok: false; code: AiQuotaErrorCode }

export async function getAiQuota(input: { ip: string }): Promise<AiQuotaServiceResult> {
  if (!checkRateLimit(`ai-quota:${input.ip}`, 30, 60_000).allowed) {
    return { ok: false, code: 'RATE_LIMITED' }
  }
  try {
    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
    const result = await checkAiQuota(supabase, identity.data.id)
    return {
      ok: true,
      data: {
        remaining: result.remaining,
        limit: result.limit,
        resetIn: result.resetIn,
        days: result.resetIn > 0 ? Math.ceil(result.resetIn / 86_400) : 0,
      },
    }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
