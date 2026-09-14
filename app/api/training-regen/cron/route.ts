import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildProgramParams } from '@/lib/training/build-program-params'
import { generateProgram } from '@/lib/training/generate-program'
import { loadExerciseCatalog } from '@/lib/training/load-exercise-catalog'
import { buildAthenaClientContext, formatAthenaClientContextForPrompt } from '@/lib/athena/client-context'
import { clearPlanRegenerationRequest, readPlanRegenerationRequest } from '@/lib/athena/objective-transition'
import { replacePersonalTrainingProgram } from '@/lib/training/replace-personal-program'
import type { Profile } from '@/lib/profile-service'

// Vercel : Hobby clamp 60s, Pro 300s. La génération programme ~50s/user.
// Capacité réelle : ~1 user/run sur Hobby (60s), ~5-6 users/run sur Pro (300s).
// Only explicit, versioned objective-change requests are processed. Programs
// are not replaced on a timer merely to create novelty.
export const maxDuration = 300

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

  // 3. API KEY
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'API key manquante' }, { status: 500 })
  }

  // 4. FETCH EXPLICIT REGENERATION REQUESTS
  const { data: users, error: usersErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .eq('onboarding_completed', true)
    .not('onboarding_answers->plan_regeneration_request', 'is', null)

  if (usersErr) {
    console.error('[cron training-regen] Error fetching users:', usersErr)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // 5. GENERATE FOR EACH USER (batch parallel, concurrency=3)
  // Concurrency 3 : génération programme ~50s, compromis vitesse / rate limit.
  const CONCURRENCY = 3
  // Load exercise catalog once for all users
  const catalog = await loadExerciseCatalog(supabaseAdmin)
  const startTime = Date.now()
  const results = {
    total: users?.length || 0,
    success: 0,
    errors: 0,
    details: [] as { user_id: string; status: string }[],
  }
  const allUsers = users || []

  for (let i = 0; i < allUsers.length; i += CONCURRENCY) {
    const batch = allUsers.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (profile: Profile) => {
      try {
        const request = readPlanRegenerationRequest(profile.onboarding_answers)
        if (!request) {
          results.errors++
          results.details.push({ user_id: profile.id, status: 'invalid_request' })
          return
        }
        const params = buildProgramParams(profile, {
          notes: `Remplace le programme car le client a explicitement changé son objectif vers ${request.objective}. Conserve les contraintes déclarées et ne change que ce que le nouvel objectif exige.`,
        })
        const clientContext = formatAthenaClientContextForPrompt(buildAthenaClientContext(profile))
        const program = await generateProgram({ ...params, clientContext }, apiKey, catalog)
        if (!program) throw new Error('No program generated')

        const replacement = await replacePersonalTrainingProgram(supabaseAdmin, profile.id, {
          name: program.program_name || 'Programme IA',
          description: program.description || '',
          days: program.days || [],
          source: 'objective_change',
        })
        if (!replacement.ok) throw new Error('Program replacement failed')

        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            onboarding_answers: clearPlanRegenerationRequest(profile.onboarding_answers),
            next_program_regen_at: null,
          })
          .eq('id', profile.id)
        if (profileUpdateError) throw new Error('Profile marker clear failed')

        results.success++
        results.details.push({ user_id: profile.id, status: 'success' })
      } catch {
        results.errors++
        results.details.push({ user_id: profile.id, status: 'error' })
      }
    }))
  }

  const durationMs = Date.now() - startTime
  console.log('[cron training-regen]', JSON.stringify({
    total: results.total,
    success: results.success,
    errors: results.errors,
    duration_ms: durationMs,
    concurrency: CONCURRENCY,
  }))
  return NextResponse.json(results)
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'training-regen cron',
    method: 'POST with Bearer CRON_SECRET',
    status: 'ready',
  })
}
