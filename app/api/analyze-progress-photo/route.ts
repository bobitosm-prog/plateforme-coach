import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildProgressPhotoAssessmentInvocation, buildProgressPhotoInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { AI_PROVIDER_LIMITS } from '../../../lib/ai/provider'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToTextRequest } from '../../../lib/ai/providers/anthropic'
import { aiFreeTextSchema, validateAiOutput } from '../../../lib/ai/schemas'
import { getAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

function isImageMediaType(value: string): value is typeof IMAGE_MEDIA_TYPES[number] {
  return IMAGE_MEDIA_TYPES.some(mediaType => mediaType === value)
}

async function fetchImage(url: string): Promise<{ base64: string; mediaType: typeof IMAGE_MEDIA_TYPES[number] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('image_unavailable')
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) throw new Error('invalid_image')
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  if (!isImageMediaType(mediaType) || base64.length > AI_PROVIDER_LIMITS.maxImageBase64Characters) {
    throw new Error('invalid_image')
  }
  return { base64, mediaType }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(`photo:${ip}`, 3, 60000)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-opus-4.8')
  if (!model.ok || model.model.status !== 'active') {
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  }
  const usage = await startAiUsage({
    client: supabase,
    feature: 'analyze-progress-photo',
    principal: { kind: 'user', id: user.id },
    correlationId,
    logicalModel: model.model.logicalId,
  })
  if (usage.status === 'denied') return usage.reason === 'monthly_exhausted'
    ? aiQuotaResponse(6, Math.ceil(usage.retryAfterMs / 1000))
    : aiRateLimitResponse(10, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') {
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  }

  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
  let reasonCode = 'request_failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const body = await req.json()
    const { photoUrl, profileData, previousPhotoUrl, mode, photoFrontUrl, photoBackUrl, photoSideUrl } = body
    let invocation

    if (mode === 'assessment') {
      const [frontImg, backImg, sideImg] = await Promise.all([
        fetchImage(photoFrontUrl),
        fetchImage(photoBackUrl),
        fetchImage(photoSideUrl),
      ])
      invocation = buildProgressPhotoAssessmentInvocation({ profileData, frontImg, backImg, sideImg })
    } else {
      if (!photoUrl) return NextResponse.json({ error: 'Photo URL manquante' }, { status: 400 })
      const mainImage = await fetchImage(photoUrl)
      let previousImage: Awaited<ReturnType<typeof fetchImage>> | null = null
      if (previousPhotoUrl) {
        try {
          previousImage = await fetchImage(previousPhotoUrl)
        } catch {
          previousImage = null
        }
      }
      invocation = buildProgressPhotoInvocation({ profileData, mainImage, previousImage })
    }

    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(
      promptInvocationToTextRequest(invocation, model.model.providerModelId),
      {
        correlationId,
        timeoutMs: 300_000,
        cancellation: abortSignalToAiCancellation(req.signal),
      },
    )
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

    const analysis = validateAiOutput(aiFreeTextSchema, generated.value)
    if (!analysis.ok) {
      reasonCode = 'invalid_output'
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }

    outcome = 'succeeded'
    reasonCode = 'completed'
    return NextResponse.json({ analysis: analysis.value })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode, providerModel, tokens })
  }
}
