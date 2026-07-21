import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { buildBodyAnalysisInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateToolUse } from '../../../lib/ai/parsing'
import { bodyAnalysisOutputSchema } from '../../../lib/ai/schemas'

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
  const usage = await startAiUsage({ client: supabase, feature: 'analyze-body', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-opus-4-8' })
  if (usage.status === 'denied') return usage.reason === 'monthly_exhausted'
    ? aiQuotaResponse(6, Math.ceil(usage.retryAfterMs / 1000))
    : aiRateLimitResponse(5, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
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
      return { base64, mediaType }
    }

    const [front, back, side] = await Promise.all([
      fetchImage(photoFrontUrl),
      fetchImage(photoBackUrl),
      fetchImage(photoSideUrl),
    ])

    const invocation = buildBodyAnalysisInvocation({ front, back, side, weight, height })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(invocation),
    })

    if (!response.ok) {
      console.error('[analyze-body] Claude API error:', response.status)
      return NextResponse.json({ error: `Erreur IA (${response.status})` }, { status: response.status })
    }

    const data = await response.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const parsed = parseAndValidateToolUse(data, 'body_analysis_output', bodyAnalysisOutputSchema)
    if (!parsed.ok) {
      console.error('[analyze-body] Invalid structured response')
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }
    const result = parsed.value
    outcome = 'succeeded'
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[analyze-body] Error:', e.message)
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
