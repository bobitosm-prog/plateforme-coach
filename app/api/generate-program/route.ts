import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { guardCoachManagedCapabilities } from '../../../lib/api-guard'
import { checkAiQuota, checkAiRateLimit, checkRateLimit, aiQuotaResponse, aiRateLimitResponse, logAiUsage } from '../../../lib/rate-limit'
import { generateProgram } from '../../../lib/training/generate-program'
import { loadExerciseCatalog } from '../../../lib/training/load-exercise-catalog'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const
const schema = z.object({
  objective: z.string().trim().min(1).max(200),
  level: z.string().trim().min(1).max(50),
  equipment: z.array(z.string().trim().min(1).max(80)).max(20).or(z.string().trim().max(500)),
  trainingDays: z.number().int().min(2).max(6),
  weight: z.union([z.number(), z.string()]).optional(),
  targetWeight: z.union([z.number(), z.string()]).optional(),
}).strict()

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll() } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const localLimit = checkRateLimit(`program:${req.headers.get('x-forwarded-for') || 'unknown'}`, 3, 60_000)
  if (!localLimit.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  const blocked = await guardCoachManagedCapabilities(user.id)
  if (blocked) return blocked
  const aiLimit = await checkAiRateLimit(supabase, user.id, 'generate-program')
  if (!aiLimit.allowed) return aiRateLimitResponse(aiLimit.limit, aiLimit.resetIn)
  const quota = await checkAiQuota(supabase, user.id)
  if (!quota.allowed) return aiQuotaResponse(quota.limit, quota.resetIn)

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
    const input = parsed.data
    const catalog = await loadExerciseCatalog(supabase)
    const generated = await generateProgram({
      objective: input.objective,
      level: input.level,
      daysPerWeek: input.trainingDays,
      duration: 60,
      equipment: Array.isArray(input.equipment) ? input.equipment.join(', ') : input.equipment,
      priorities: [], notes: '', gender: '',
    }, apiKey, catalog)
    await logAiUsage(supabase, user.id, 'generate-program')
    const program = Object.fromEntries(DAYS.map((day, index) => {
      const generatedDay = generated.days[index]
      return [day, generatedDay ? {
        isRest: false,
        day_name: generatedDay.name,
        exercises: generatedDay.exercises.map(exercise => ({
          name: exercise.custom_name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.rest_seconds,
          notes: exercise.technique_details,
        })),
      } : { isRest: true, day_name: 'Repos', exercises: [] }]
    }))
    return NextResponse.json({ program })
  } catch {
    console.error('[generate-program] validated generation failed')
    return NextResponse.json({ error: 'Génération temporairement indisponible' }, { status: 503 })
  }
}
