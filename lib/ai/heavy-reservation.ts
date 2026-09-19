import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { aiQuotaResponse, aiRateLimitResponse, type HEAVY_AI_ENDPOINTS } from '@/lib/rate-limit'

type HeavyEndpoint = (typeof HEAVY_AI_ENDPOINTS)[number]
let client: SupabaseClient | null = null
function trustedClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Quota service unavailable')
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}
export const quotaUnavailable = () => Response.json({ error: 'Vérification des limites indisponible' }, { status: 503 })

/** Server-only admission. Caller MUST supply the id verified by auth.getUser(). */
export async function reserveHeavyAi(authenticatedUserId: string, endpoint: HeavyEndpoint): Promise<
  { ok: false; response: Response } | { ok: true; settle: (success: boolean) => Promise<boolean> }
> {
  const operationId = crypto.randomUUID()
  try {
    const db = trustedClient()
    const { data, error } = await db.rpc('reserve_heavy_ai_v1', {
      p_user_id: authenticatedUserId, p_endpoint: endpoint, p_operation_id: operationId,
    })
    if (error || typeof data?.allowed !== 'boolean') return { ok: false, response: quotaUnavailable() }
    if (!data.allowed) {
      if (!Number.isInteger(data.limit) || data.limit <= 0 || !Number.isInteger(data.resetIn) || data.resetIn < 1) {
        return { ok: false, response: quotaUnavailable() }
      }
      if (data.reason === 'busy') return { ok: false, response: Response.json({
        error: 'Des générations sont en cours. Réessayez après leur finalisation.',
        reason: 'generation_in_progress', retryAfter: data.resetIn,
      }, { status: 429, headers: { 'Retry-After': String(data.resetIn) } }) }
      return { ok: false, response: data.reason === 'monthly' ? aiQuotaResponse(data.limit, data.resetIn)
        : data.reason === 'hourly' ? aiRateLimitResponse(data.limit, data.resetIn) : quotaUnavailable() }
    }
    if (data.operationId !== operationId) return { ok: false, response: quotaUnavailable() }
    let completed: boolean | null = null
    return { ok: true, settle: async success => {
      if (completed !== null) return completed === success
      try {
        const result = await db.rpc('settle_heavy_ai_v1', {
          p_user_id: authenticatedUserId, p_operation_id: operationId, p_success: success,
        })
        if (result.error || result.data !== true) return false
        completed = success
        return true
      } catch { return false }
    } }
  } catch { return { ok: false, response: quotaUnavailable() } }
}
