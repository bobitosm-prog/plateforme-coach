import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildBodyAnalysisInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { AI_PROVIDER_LIMITS } from '../../../lib/ai/provider'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToToolRequest } from '../../../lib/ai/providers/anthropic'
import { createAiOutputValidator, bodyAnalysisOutputSchema } from '../../../lib/ai/schemas'
import { getAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

function isImageMediaType(value: string): value is typeof IMAGE_MEDIA_TYPES[number] {
  return IMAGE_MEDIA_TYPES.some(mediaType => mediaType === value)
}

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`body:${ip}`, 5, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  // DB-backed hourly rate limit
  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-opus-4.8')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabase, feature: 'analyze-body', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status === 'denied') return usage.reason === 'monthly_exhausted'
    ? aiQuotaResponse(6, Math.ceil(usage.retryAfterMs / 1000))
    : aiRateLimitResponse(5, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
  let reasonCode = 'request_failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { photoFrontUrl, photoBackUrl, photoSideUrl, weight, height } = await req.json()
    if (!photoFrontUrl || !photoBackUrl || !photoSideUrl) {
      return NextResponse.json({ error: '3 photos requises (face, dos, profil)' }, { status: 400 })
    }

    const fetchImage = async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
      if (!isImageMediaType(mediaType) || base64.length > AI_PROVIDER_LIMITS.maxImageBase64Characters) throw new Error('invalid_image')
      return { base64, mediaType }
    }

    const [front, back, side] = await Promise.all([
      fetchImage(photoFrontUrl),
      fetchImage(photoBackUrl),
      fetchImage(photoSideUrl),
    ])

    const invocation = buildBodyAnalysisInvocation({ front, back, side, weight, height })

    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(promptInvocationToToolRequest(
      invocation,
      model.model.providerModelId,
      createAiOutputValidator(bodyAnalysisOutputSchema),
    ), {
      correlationId,
      timeoutMs: 300_000,
      cancellation: abortSignalToAiCancellation(req.signal),
    })
    providerModel = generated.metadata.actualModel
    tokens = generated.metadata.usage
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') {
        outcome = 'cancelled'
        reasonCode = 'request_cancelled'
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
      }
      if (generated.error.code === 'quota_exceeded') {
        reasonCode = 'provider_quota'
        return NextResponse.json({ error: 'Erreur IA (429)' }, { status: 429 })
      }
      if (generated.error.code === 'invalid_output') {
        reasonCode = 'invalid_output'
        return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
      }
      reasonCode = 'provider_error'
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }
    outcome = 'succeeded'
    reasonCode = 'completed'
    return NextResponse.json(generated.value)
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode, providerModel, tokens })
  }
}
