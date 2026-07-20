import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, checkAiQuota, aiRateLimitResponse, aiQuotaResponse, logAiUsage } from '../../../lib/rate-limit'
import { unwrapToolInput } from '../../../lib/anthropic/unwrap-tool-input'
import { buildBodyAnalysisInvocation } from '../../../lib/ai/prompts'

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
  const aiRl = await checkAiRateLimit(supabase, user.id, 'analyze-body')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  const aiQ = await checkAiQuota(supabase, user.id)
  if (!aiQ.allowed) return aiQuotaResponse(aiQ.limit, aiQ.resetIn)
  await logAiUsage(supabase, user.id, 'analyze-body')

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
      const err = await response.text()
      console.error('[analyze-body] Claude API error:', response.status, err)
      return NextResponse.json({ error: `Erreur IA (${response.status}): ${err.slice(0, 200)}` }, { status: response.status })
    }

    const data = await response.json()
    const toolUseBlock = data.content?.find((c: any) => c.type === 'tool_use')
    if (!toolUseBlock) {
      console.error('[analyze-body] No tool_use in response:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }

    const result = unwrapToolInput(toolUseBlock.input)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[analyze-body] Error:', e.message)
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 })
  }
}
