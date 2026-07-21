import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

import { createApiRouteObservability } from '@/lib/api/route-observability'
import { validateJsonBody } from '@/lib/api/validation'
import { createAnthropicMealGenerationProvider, generateMealPlan, mealGenerationParamsSchema } from '@/lib/nutrition/meal-generation'
import { aiUsageCorrelationId, startAiUsage } from '@/lib/ai/usage'
import { aiQuotaResponse, aiRateLimitResponse, checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 300

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: NextRequest) {
  const observation = createApiRouteObservability(req, { event: 'MEAL_PLAN_GENERATION', domain: 'nutrition', operation: 'POST /api/generate-meal-plan' })
  const finish = (response: Response, outcome: 'success' | 'rejected' | 'failed', reason: string) => observation.complete(response, { outcome, reason })
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return finish(jsonError('Non autorisé', 401), 'rejected', 'AUTH_REQUIRED')

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(`meal-plan:${ip}`, 3, 60_000)
  if (!rateLimit.allowed) return finish(jsonError(`Trop de requetes. Reessayez dans ${rateLimit.retryAfter}s.`, 429), 'rejected', 'RATE_LIMITED')
  const usage = await startAiUsage({ client: supabaseAuth, feature: 'generate-meal-plan', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-opus-4-8' })
  if (usage.status === 'denied') return finish(usage.reason === 'monthly_exhausted'
    ? aiQuotaResponse(6, Math.ceil(usage.retryAfterMs / 1000))
    : aiRateLimitResponse(10, Math.ceil(usage.retryAfterMs / 1000)), 'rejected', usage.reason === 'monthly_exhausted' ? 'AI_QUOTA_EXCEEDED' : 'AI_RATE_LIMITED')
  if (usage.status !== 'started') return finish(jsonError('Service temporairement indisponible', usage.status === 'conflict' ? 409 : 503), 'failed', 'USAGE_STORE_UNAVAILABLE')

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'provider_not_configured' })
    return finish(jsonError('API key manquante', 500), 'failed', 'PROVIDER_NOT_CONFIGURED')
  }
  const validated = await validateJsonBody(req, mealGenerationParamsSchema)
  if (!validated.ok) {
    await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'validation_error' })
    return finish(validated.response, 'rejected', 'VALIDATION_ERROR')
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { guardInvitedClient } = await import('@/lib/api-guard')
    const blocked = await guardInvitedClient(user.id)
    if (blocked) {
      await usage.tracker.finalize({ outcome: 'cancelled', reasonCode: 'role_forbidden' })
      return finish(blocked, 'rejected', 'ROLE_FORBIDDEN')
    }
  }

  const encoder = new TextEncoder()
  const provider = createAnthropicMealGenerationProvider({ apiKey })
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await generateMealPlan(validated.data, provider, (event) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        })
        await usage.tracker.finalize({ outcome: 'succeeded', reasonCode: result.partial ? 'partial_completed' : 'completed', attemptCount: 7 })
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', plan: result.plan })}\n\n`))
        controller.close()
      } catch {
        await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'provider_error', attemptCount: 7 })
        controller.error(new Error('Meal generation failed'))
      }
    },
  })
  return finish(new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }), 'success', 'MEAL_PLAN_STREAM_STARTED')
}
