import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'

export async function POST(req: NextRequest) {
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

  // 4. GENERATE FOR EACH USER (sequential to avoid API rate limits)
  const results = {
    total: users?.length || 0,
    success: 0,
    skipped: 0,
    errors: 0,
    details: [] as { user_id: string; status: string; error?: string; diagnostic_id?: string }[],
  }

  for (const u of users || []) {
    try {
      const result = await generateWeeklyDiagnostic(u.id, supabaseAdmin)

      if (result.already_exists) {
        results.skipped++
        results.details.push({ user_id: u.id, status: 'skipped' })
      } else if (result.error) {
        results.errors++
        results.details.push({ user_id: u.id, status: 'error', error: result.error })
      } else {
        results.success++
        results.details.push({ user_id: u.id, status: 'success', diagnostic_id: result.diagnostic_id })
      }
    } catch (e: any) {
      results.errors++
      results.details.push({ user_id: u.id, status: 'error', error: e.message })
    }
  }

  console.log('[cron weekly-diagnostic]', JSON.stringify({
    total: results.total,
    success: results.success,
    skipped: results.skipped,
    errors: results.errors,
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
