import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit, checkAiRateLimit, logAiUsage, aiRateLimitResponse } from '../../../lib/rate-limit'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { confirmWeeklyCompletion, readWeeklyCompletion } from '@/lib/weekly-diagnostic/completion'

const requestSchema = z.object({
  action: z.literal('complete-week').optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealsConfirmed: z.boolean().optional(),
  skipTraining: z.boolean().optional(),
})

async function handle(req: NextRequest) {
  // Auth (session user)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Rate limit
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`diag:${user.id}:${ip}:${req.method}`, req.method === 'GET' ? 30 : 6, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  try {
    if (req.method === 'GET') {
      return NextResponse.json({ completion: (await readWeeklyCompletion(supabase, user.id)).status }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const raw = await req.text()
    let value: unknown
    try { value = raw ? JSON.parse(raw) : {} } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
    const parsed = requestSchema.safeParse(value)
    if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    const input = parsed.data
    if (input.action === 'complete-week') {
      const result = await confirmWeeklyCompletion(supabase, user.id, input)
      return NextResponse.json(result, { status: result.status ?? 200 })
    }
    const { status: completion } = await readWeeklyCompletion(supabase, user.id)
    if (!completion.canGenerate && !completion.diagnosticId) return NextResponse.json({ error: 'Confirme ta journée du dimanche.', completion }, { status: 409 })
    if (!completion.diagnosticId) {
      const aiRl = await checkAiRateLimit(supabase, user.id, 'weekly-diagnostic', true)
      if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
      await logAiUsage(supabase, user.id, 'weekly-diagnostic')
    }

    const writer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const result = await generateWeeklyDiagnostic(user.id, supabase, writer)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.blocked ? 409 : 500 })
    }
    return NextResponse.json({
      already_exists: result.already_exists ?? false,
      diagnostic_id: result.diagnostic_id,
      diagnostic: result.diagnostic,
    })
  } catch {
    return NextResponse.json({ error: 'Diagnostic temporairement indisponible' }, { status: 503 })
  }
}

export const GET = handle
export const POST = handle
