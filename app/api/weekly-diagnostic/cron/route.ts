import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { aiUsageCorrelationId, startAiUsage } from '@/lib/ai/usage'

// Vercel : Hobby clamp à 60s, Pro à 300s. La valeur 300 est posée
// en prévision de l'upgrade Pro (clampée silencieusement sur Hobby).
// Capacité réelle : ~14 users/run sur Hobby, ~75 users/run sur Pro.
// TODO upgrade Vercel Pro quand on atteint 10 clients payants.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const operationId = aiUsageCorrelationId(req)
  // 1. AUTH via CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  const expectedSecret = process.env.CRON_SECRET || ''
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. ADMIN SUPABASE CLIENT (service_role, bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 3. FETCH ACTIVE CLIENT USERS
  // Filter users whose diagnostic is due (next_diagnostic_at <= NOW or NULL)
  const nowIso = new Date().toISOString()
  console.log(`[cron weekly-diagnostic] Filtering users due (now=${nowIso})`)

  const { data: users, error: usersErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, next_diagnostic_at')
    .eq('role', 'client')
    .eq('onboarding_completed', true)
    .or(`next_diagnostic_at.is.null,next_diagnostic_at.lte.${nowIso}`)

  if (usersErr) {
    console.error('[cron weekly-diagnostic] Error fetching users:', usersErr)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // 4. GENERATE FOR EACH USER (batch parallel, concurrency=5)
  // Concurrency 5 = compromis vitesse / rate limit Anthropic
  // 1 user ≈ 17s → batch de 5 ≈ 20s
  // Capacité : ~14 users sur Hobby (60s), ~75 users sur Pro (300s)
  const CONCURRENCY = 5
  const startTime = Date.now()

  const results = {
    total: users?.length || 0,
    success: 0,
    skipped: 0,
    errors: 0,
    details: [] as { user_id: string; status: string; error?: string; diagnostic_id?: string }[],
  }

  const allUsers = users || []
  for (let i = 0; i < allUsers.length; i += CONCURRENCY) {
    const batch = allUsers.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (u) => {
      const usage = await startAiUsage({ client: supabaseAdmin, feature: 'weekly-diagnostic-cron', principal: { kind: 'server', id: 'cron.weekly-diagnostic', subjectUserId: u.id }, correlationId: `${operationId.slice(0, 80)}:${u.id}`, logicalModel: 'claude-opus-4-8' })
      if (usage.status !== 'started') {
        results.errors++
        results.details.push({ user_id: u.id, status: 'error', error: 'Usage store unavailable' })
        return
      }
      try {
        const result = await generateWeeklyDiagnostic(u.id, supabaseAdmin)

        if (result.already_exists) {
          await usage.tracker.finalize({ outcome: 'cancelled', reasonCode: 'already_exists' })
          results.skipped++
          results.details.push({ user_id: u.id, status: 'skipped' })
        } else if (result.error) {
          await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'generation_failed' })
          results.errors++
          results.details.push({ user_id: u.id, status: 'error', error: result.error })
        } else {
          await usage.tracker.finalize({ outcome: 'succeeded', reasonCode: 'completed', providerModel: result.providerModel, tokens: result.tokens })
          results.success++
          results.details.push({ user_id: u.id, status: 'success', diagnostic_id: result.diagnostic_id })
        }
      } catch (e: any) {
        await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'unexpected_error' })
        results.errors++
        results.details.push({ user_id: u.id, status: 'error', error: e.message })
      }
    }))
  }

  const durationMs = Date.now() - startTime

  console.log('[cron weekly-diagnostic]', JSON.stringify({
    total: results.total,
    success: results.success,
    skipped: results.skipped,
    errors: results.errors,
    duration_ms: durationMs,
    concurrency: CONCURRENCY,
  }))

  return NextResponse.json(results)
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'weekly-diagnostic cron',
    method: 'POST with Bearer CRON_SECRET',
    status: 'ready',
  })
}
