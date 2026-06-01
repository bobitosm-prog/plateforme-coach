import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, logAiUsage, aiRateLimitResponse } from '../../../lib/rate-limit'
import { generateProgram } from '../../../lib/training/generate-program'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`custom-prog:${ip}`, 3, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  // DB-backed hourly rate limit (Sprint 3)
  const aiRl = await checkAiRateLimit(supabaseAuth, user.id, 'generate-custom-program')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  await logAiUsage(supabaseAuth, user.id, 'generate-custom-program')

  try {
    const body = await req.json()
    const { objective, level, daysPerWeek, duration, equipment, priorities, notes, gender: bodyGender } = body
    const userId = user.id

    // Guard: invited clients cannot generate AI programs
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { guardInvitedClient } = await import('../../../lib/api-guard')
      const blocked = await guardInvitedClient(userId)
      if (blocked) return blocked
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'API key manquante' }, { status: 500 })
    }

    const days = parseInt(daysPerWeek) || 4
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat : garde la connexion active pendant la génération (~50s)
        // sinon l'edge Vercel coupe une réponse silencieuse trop longue (bug prod status '---')
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress' })}\n\n`))
          } catch {
            // controller déjà fermé, ignorer
          }
        }, 5000)
        try {
          const program = await generateProgram({
            objective, level, daysPerWeek: days, duration, equipment, priorities, notes, gender: bodyGender,
          }, apiKey)
          clearInterval(heartbeat)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', program })}\n\n`))
          controller.close()
        } catch (e: any) {
          clearInterval(heartbeat)
          console.error('[generate-custom-program] ERROR:', e.message)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`))
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })

  } catch (e: any) {
    console.error('[generate-custom-program] ERROR:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
