import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, checkAiQuota, logAiUsage, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { generateProgram } from '../../../lib/training/generate-program'
import { loadExerciseCatalog } from '../../../lib/training/load-exercise-catalog'
import { guardCoachManagedCapabilities } from '../../../lib/api-guard'
import { z } from 'zod'

export const maxDuration = 300

const schema = z.object({
  objective: z.string().trim().min(1).max(200), level: z.string().trim().min(1).max(50),
  daysPerWeek: z.number().int().min(2).max(6), duration: z.number().int().min(20).max(120),
  equipment: z.string().trim().max(500), priorities: z.array(z.string().trim().max(120)).max(12).default([]),
  notes: z.string().trim().max(500).default(''), gender: z.string().trim().max(30).default(''),
}).strict()

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
  const aiQ = await checkAiQuota(supabaseAuth, user.id)
  if (!aiQ.allowed) return aiQuotaResponse(aiQ.limit, aiQ.resetIn)
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    const { objective, level, daysPerWeek, duration, equipment, priorities, notes, gender: bodyGender } = parsed.data
    const userId = user.id

    // Coach-managed capabilities do not include AI program generation.
    const blocked = await guardCoachManagedCapabilities(userId)
    if (blocked) return blocked

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
    }

    const days = daysPerWeek
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
          const catalog = await loadExerciseCatalog(supabaseAuth)
          const program = await generateProgram({
            objective, level, daysPerWeek: days, duration, equipment, priorities, notes, gender: bodyGender,
          }, apiKey, catalog)
          await logAiUsage(supabaseAuth, user.id, 'generate-custom-program')
          clearInterval(heartbeat)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', program })}\n\n`))
          controller.close()
        } catch {
          clearInterval(heartbeat)
          console.error('[generate-custom-program] validated generation failed')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Génération temporairement indisponible' })}\n\n`))
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })

  } catch {
    console.error('[generate-custom-program] unexpected failure')
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  }
}
