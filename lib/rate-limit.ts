import type { SupabaseClient } from '@supabase/supabase-js'

// ── In-memory rate limiter (existing, used by chat-ai, suggest-exercise, etc.) ──

const store = new Map<string, { count: number; reset: number }>()

export function checkRateLimit(id: string, max: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  if (store.size > 5000) {
    for (const [k, v] of store) { if (now > v.reset) store.delete(k) }
  }
  const rec = store.get(id)
  if (!rec || now > rec.reset) {
    store.set(id, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: max - 1 }
  }
  if (rec.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((rec.reset - now) / 1000) }
  }
  rec.count++
  return { allowed: true, remaining: max - rec.count }
}

// ── DB-backed rate limiter (Sprint 3 — for expensive AI endpoints) ──

export const AI_RATE_LIMITS: Record<string, number> = {
  'generate-custom-program': 5,
  'analyze-progress-photo': 10,
  'generate-meal-plan': 10,
}

const WINDOW_SECONDS = 3600

export type AiRateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  resetIn: number
}

export async function checkAiRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<AiRateLimitResult> {
  const limit = AI_RATE_LIMITS[endpoint]
  if (limit === undefined) {
    return { allowed: true, remaining: 999, limit: 999, resetIn: 0 }
  }

  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString()

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  // Fail-open: better than global downtime
  if (error) {
    console.error('[AiRateLimit] DB error, failing open:', error.message)
    return { allowed: true, remaining: limit, limit, resetIn: 0 }
  }

  const current = count ?? 0
  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
    limit,
    resetIn: WINDOW_SECONDS,
  }
}

export async function logAiUsage(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<void> {
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    endpoint,
  })
  if (error) console.error('[AiRateLimit] Failed to log usage:', error.message)
}

export function aiRateLimitResponse(limit: number, resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Limite de ${limit} appels par heure atteinte. Réessayez plus tard.`,
      retryAfter: resetIn,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetIn),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
      },
    }
  )
}
