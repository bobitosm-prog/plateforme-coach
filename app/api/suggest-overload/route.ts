import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '../../../lib/rate-limit'
import { guardCoachManagedCapabilities } from '../../../lib/api-guard'
import {
  deriveProgressionDecision,
  type ProgressionHistorySet,
} from '../../../lib/athena/progression-model'

const requestSchema = z.object({
  exerciseName: z.string().trim().min(1).max(200),
  exerciseId: z.string().uuid().nullable().optional(),
  currentWeight: z.number().positive().max(1000),
  currentReps: z.number().int().min(1).max(100),
  setsCompleted: z.number().int().min(1).max(20),
  setsTarget: z.number().int().min(1).max(20),
  targetReps: z.string().trim().min(1).max(20).nullable(),
  currentRirs: z.array(z.number().int().min(0).max(4).nullable()).max(20),
  sessionId: z.string().uuid(),
}).strict()

type HistoryRow = {
  session_id?: unknown
  weight?: unknown
  reps?: unknown
  rir?: unknown
  completed?: unknown
  created_at?: unknown
  workout_sessions?: unknown
}

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUGGEST_OVERLOAD_NOT_CONFIGURED')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

function relatedSessionIsCompleted(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(relatedSessionIsCompleted)
  return typeof value === 'object' && value !== null && (value as { completed?: unknown }).completed === true
}

function historySet(row: HistoryRow): ProgressionHistorySet | null {
  const sessionId = typeof row.session_id === 'string' ? row.session_id : null
  const weight = typeof row.weight === 'number' ? row.weight : Number(row.weight)
  const reps = typeof row.reps === 'number' ? row.reps : Number(row.reps)
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null
  const rirValue = row.rir === null || row.rir === undefined
    ? null
    : typeof row.rir === 'number' ? row.rir : Number(row.rir)
  if (!sessionId || !Number.isFinite(weight) || !Number.isFinite(reps) || !createdAt) return null
  return {
    sessionId,
    completed: row.completed === true,
    sessionCompleted: relatedSessionIsCompleted(row.workout_sessions),
    weight,
    reps,
    rir: rirValue !== null && Number.isFinite(rirValue) && rirValue >= 0 && rirValue <= 4 ? rirValue : null,
    createdAt,
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(`overload:${ip}`, 10, 60_000)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

  const blocked = await guardCoachManagedCapabilities(user.id)
  if (blocked) return blocked

  try {
    const input = parsed.data
    const supabase = getServiceSupabase()
    const { data: origin, error: originError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('id', input.sessionId)
      .eq('user_id', user.id)
      .eq('completed', true)
      .maybeSingle()
    if (originError || !origin) {
      return NextResponse.json({ skipped: true, reason: 'completed_session_not_found' })
    }

    const { data: existing, error: existingError } = await supabase
      .from('progressive_overload_suggestions')
      .select('id')
      .eq('user_id', user.id)
      .eq('exercise_name', input.exerciseName)
      .eq('status', 'pending')
      .maybeSingle()
    if (existingError) return NextResponse.json({ error: 'Lecture impossible' }, { status: 503 })
    if (existing) return NextResponse.json({ skipped: true, reason: 'already_pending' })

    let historyQuery = supabase
      .from('workout_sets')
      .select('session_id, weight, reps, rir, completed, created_at, workout_sessions!inner(completed)')
      .eq('user_id', user.id)
      .eq('completed', true)
      .eq('workout_sessions.completed', true)
      .order('created_at', { ascending: false })
      .limit(60)
    historyQuery = input.exerciseId
      ? historyQuery.eq('exercise_id', input.exerciseId)
      : historyQuery.eq('exercise_name', input.exerciseName)
    const { data: historyRows, error: historyError } = await historyQuery
    if (historyError) return NextResponse.json({ error: 'Historique indisponible' }, { status: 503 })

    const history = ((historyRows ?? []) as HistoryRow[]).flatMap(row => historySet(row) ?? [])
    const decision = deriveProgressionDecision({
      currentWeight: input.currentWeight,
      currentReps: input.currentReps,
      setsCompleted: input.setsCompleted,
      setsTarget: input.setsTarget,
      targetReps: input.targetReps,
      currentRirs: input.currentRirs,
      history,
    })
    if (decision.action === 'hold') {
      return NextResponse.json({ skipped: true, reason: decision.reason })
    }

    const { error: insertError } = await supabase
      .from('progressive_overload_suggestions')
      .insert({
        user_id: user.id,
        exercise_name: input.exerciseName,
        current_weight: input.currentWeight,
        current_reps: input.currentReps,
        suggested_weight: decision.suggestedWeight,
        suggested_reps: decision.suggestedReps,
        reasoning: decision.reasoning,
        status: 'pending',
        session_id_origin: input.sessionId,
      })
    if (insertError) {
      return NextResponse.json({
        skipped: true,
        reason: insertError.code === '23505' ? 'already_pending' : 'insert_failed',
      })
    }

    return NextResponse.json({
      ok: true,
      suggestion: {
        exerciseName: input.exerciseName,
        currentWeight: input.currentWeight,
        suggestedWeight: decision.suggestedWeight,
        suggestedReps: decision.suggestedReps,
        reasoning: decision.reasoning,
        action: decision.action,
        confidence: decision.confidence,
        evidenceSessions: decision.evidenceSessions,
      },
    })
  } catch {
    console.error('[suggest-overload] unexpected failure')
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  }
}
