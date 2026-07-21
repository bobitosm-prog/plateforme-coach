import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { buildProgressPhotoAssessmentInvocation, buildProgressPhotoInvocation } from '../../../lib/ai/prompts'

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
  const rl = checkRateLimit(`photo:${ip}`, 3, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  // DB-backed hourly rate limit (Sprint 3)
  const usage = await startAiUsage({ client: supabase, feature: 'analyze-progress-photo', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-opus-4-8' })
  if (usage.status === 'denied') return usage.reason === 'monthly_exhausted'
    ? aiQuotaResponse(6, Math.ceil(usage.retryAfterMs / 1000))
    : aiRateLimitResponse(10, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const body = await req.json()
    const { photoUrl, profileData, previousPhotoUrl, mode, photoFrontUrl, photoBackUrl, photoSideUrl } = body

    // Fetch photo as base64 with detailed error handling
    const fetchImage = async (url: string): Promise<{ base64: string; mediaType: string }> => {
      let res: Response
      try {
        res = await fetch(url)
      } catch (fetchErr: any) {
        console.error('[analyze-progress-photo] Fetch image failed')
        throw new Error(`Impossible de télécharger l'image: ${fetchErr.message}`)
      }

      if (!res.ok) {
        console.error('[analyze-progress-photo] Image fetch HTTP error:', res.status)
        throw new Error(`Erreur HTTP ${res.status} lors du téléchargement de l'image`)
      }

      const buffer = await res.arrayBuffer()
      if (buffer.byteLength === 0) {
        console.error('[analyze-progress-photo] Empty image buffer')
        throw new Error('Image vide reçue')
      }

      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const mediaType = contentType.split(';')[0].trim()

      return { base64, mediaType }
    }

    // ── Assessment mode (3 photos) ──
    if (mode === 'assessment') {
      const [frontImg, backImg, sideImg] = await Promise.all([
        fetchImage(photoFrontUrl),
        fetchImage(photoBackUrl),
        fetchImage(photoSideUrl),
      ])

      const invocation = buildProgressPhotoAssessmentInvocation({ profileData, frontImg, backImg, sideImg })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(invocation),
      })

      if (!res.ok) {
        return NextResponse.json({ error: `Erreur IA (${res.status})` }, { status: res.status })
      }

      const data = await res.json()
      ;({ providerModel, tokens } = readAnthropicMetadata(data))
      const analysis = data.content?.[0]?.text || 'Analyse indisponible.'
      outcome = 'succeeded'
      return NextResponse.json({ analysis })
    }

    if (!photoUrl) return NextResponse.json({ error: 'Photo URL manquante' }, { status: 400 })

    let mainImage: { base64: string; mediaType: string }
    try {
      mainImage = await fetchImage(photoUrl)
    } catch (imgErr: any) {
      return NextResponse.json({ error: imgErr.message }, { status: 500 })
    }

    let previousImage: { base64: string; mediaType: string } | null = null
    if (previousPhotoUrl) {
      try {
        previousImage = await fetchImage(previousPhotoUrl)
      } catch {
        console.error('[analyze-progress-photo] Previous photo fetch failed, continuing without comparison')
      }
    }
    const invocation = buildProgressPhotoInvocation({ profileData, mainImage, previousImage })
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(invocation),
    })

    if (!res.ok) {
      console.error('[analyze-progress-photo] Claude API error:', res.status)
      return NextResponse.json({ error: `Erreur IA (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const analysis = data.content?.[0]?.text || 'Impossible de générer l\'analyse.'

    outcome = 'succeeded'
    return NextResponse.json({ analysis })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inattendue'
    console.error('[analyze-progress-photo] Unhandled error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
