import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

import { createApiRouteObservability } from '@/lib/api/route-observability'
import { validateJsonBody } from '@/lib/api/validation'
import { createAnthropicMealGenerationProvider, generateMealPlan, mealGenerationParamsSchema } from '@/lib/nutrition/meal-generation'
import { aiQuotaResponse, aiRateLimitResponse, checkAiQuota, checkAiRateLimit, checkRateLimit, logAiUsage } from '@/lib/rate-limit'

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
  const aiRateLimit = await checkAiRateLimit(supabaseAuth, user.id, 'generate-meal-plan')
  if (!aiRateLimit.allowed) return finish(aiRateLimitResponse(aiRateLimit.limit, aiRateLimit.resetIn), 'rejected', 'AI_RATE_LIMITED')
  const quota = await checkAiQuota(supabaseAuth, user.id)
  if (!quota.allowed) return finish(aiQuotaResponse(quota.limit, quota.resetIn), 'rejected', 'AI_QUOTA_EXCEEDED')
  await logAiUsage(supabaseAuth, user.id, 'generate-meal-plan')

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return finish(jsonError('API key manquante', 500), 'failed', 'PROVIDER_NOT_CONFIGURED')
  const validated = await validateJsonBody(req, mealGenerationParamsSchema)
  if (!validated.ok) return finish(validated.response, 'rejected', 'VALIDATION_ERROR')
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { guardInvitedClient } = await import('@/lib/api-guard')
    const blocked = await guardInvitedClient(user.id)
    if (blocked) return finish(blocked, 'rejected', 'ROLE_FORBIDDEN')
  }

  const encoder = new TextEncoder()
  const provider = createAnthropicMealGenerationProvider({ apiKey })
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const result = await generateMealPlan(validated.data, provider, (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      })
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', plan: result.plan })}\n\n`))
      controller.close()
    },
  })
  return finish(new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }), 'success', 'MEAL_PLAN_STREAM_STARTED')
}
