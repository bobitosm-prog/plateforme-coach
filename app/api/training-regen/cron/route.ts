import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildProgramParams } from '@/lib/training/build-program-params'
import { generateProgram } from '@/lib/training/generate-program'
import { loadExerciseCatalog } from '@/lib/training/load-exercise-catalog'
import { aiUsageCorrelationId, startAiUsage } from '@/lib/ai/usage'
import { resolveAiModel } from '@/lib/ai/models'
import { createAnthropicProvider } from '@/lib/ai/providers/anthropic'
import { getAnthropicMessagesUrl } from '@/lib/anthropic/chat-transport'

// Vercel : Hobby clamp 60s, Pro 300s. La génération programme ~50s/user.
// Capacité réelle : ~1 user/run sur Hobby (60s), ~5-6 users/run sur Pro (300s).
// Le filtre next_program_regen_at <= NOW limite naturellement le volume par run.
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

  // 3. API KEY
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'API key manquante' }, { status: 500 })
  }
  const model = resolveAiModel('anthropic-opus-4.8')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })

  // 4. FETCH USERS DUE (next_program_regen_at <= NOW, role client, onboarded)
  const nowIso = new Date().toISOString()
  console.log(`[cron training-regen] Filtering users due (now=${nowIso})`)

  const { data: users, error: usersErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .eq('onboarding_completed', true)
    .lte('next_program_regen_at', nowIso)

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
    details: [] as { user_id: string; status: string; error?: string }[],
  }
  const allUsers = users || []
  const next14j = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  for (let i = 0; i < allUsers.length; i += CONCURRENCY) {
    const batch = allUsers.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (profile: any) => {
      const correlationId = `${operationId.slice(0, 80)}:${profile.id}`
      const usage = await startAiUsage({ client: supabaseAdmin, feature: 'training-regen', principal: { kind: 'server', id: 'cron.training-regen', subjectUserId: profile.id }, correlationId, logicalModel: model.model.logicalId })
      if (usage.status !== 'started') {
        results.errors++
        results.details.push({ user_id: profile.id, status: 'error', error: 'Usage store unavailable' })
        return
      }
      try {
        let providerModel: string | undefined
        let tokens: { inputTokens?: number; outputTokens?: number } | undefined
        const params = buildProgramParams(profile, {
          notes: 'Varie les exercices et la structure par rapport au programme precedent pour eviter la stagnation, tout en respectant le meme objectif et niveau.',
        })
        const program = await generateProgram(params, { provider, correlationId }, catalog, metadata => { ({ providerModel, tokens } = metadata) })
        if (!program) throw new Error('No program generated')

        // Deactivate old + insert new
        await supabaseAdmin
          .from('custom_programs')
          .update({ is_active: false })
          .eq('user_id', profile.id)
          .eq('is_active', true)
        const { error: insertErr } = await supabaseAdmin
          .from('custom_programs')
          .insert({
            user_id: profile.id,
            name: program.program_name || 'Programme IA',
            description: program.description || '',
            days: program.days || [],
            source: 'cron_auto',
            is_active: true,
          })
        if (insertErr) throw insertErr

        // Repousse le prochain regen +14j
        await supabaseAdmin
          .from('profiles')
          .update({ next_program_regen_at: next14j() })
          .eq('id', profile.id)

        results.success++
        await usage.tracker.finalize({ outcome: 'succeeded', reasonCode: 'completed', providerModel, tokens })
        results.details.push({ user_id: profile.id, status: 'success' })
      } catch (e: any) {
        await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'generation_failed' })
        results.errors++
        results.details.push({ user_id: profile.id, status: 'error', error: e.message })
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
