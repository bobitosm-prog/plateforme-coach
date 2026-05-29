import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, logAiUsage, aiRateLimitResponse } from '../../../lib/rate-limit'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'

export async function POST(req: NextRequest) {
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
  const rl = checkRateLimit(`diag:${ip}`, 3, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const aiRl = await checkAiRateLimit(supabase, user.id, 'weekly-diagnostic')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  await logAiUsage(supabase, user.id, 'weekly-diagnostic')

  // Delegate to generator
  const result = await generateWeeklyDiagnostic(user.id, supabase)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.already_exists) {
    return NextResponse.json({
      already_exists: true,
      diagnostic_id: result.diagnostic_id,
      message: 'Diagnostic déjà généré pour cette semaine',
    })
  }

  return NextResponse.json({
    diagnostic_id: result.diagnostic_id,
    diagnostic: result.diagnostic,
  })
}
