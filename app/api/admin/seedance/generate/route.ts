import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { createTask, type SeedanceInput, type SeedanceModel, type SeedanceGenerationType } from '@/lib/seedance/client'

export const dynamic = 'force-dynamic'

const MODELS: SeedanceModel[] = ['seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini']
const ASPECT_RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive'])
const RESOLUTIONS = new Set(['480p', '720p', '1080p', '4k'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_PROMPT = 2000
const MAX_NAME = 200

export async function POST(req: Request) {
  let admin: { userId: string; email: string }
  try {
    admin = await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  // Rate limit : generate déclenche une facturation de crédits Seedance.
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`seedance-gen:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de générations, réessaie dans une minute' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : ''
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const model: SeedanceModel = MODELS.includes(body.model) ? body.model : 'seedance-2-0'
  const generationType: SeedanceGenerationType = body.generationType === 'image-to-video' ? 'image-to-video' : 'text-to-video'
  const p = body.params || {}
  const referenceImageUrl = typeof body.referenceImageUrl === 'string' ? body.referenceImageUrl : undefined
  const exerciseId = typeof body.exerciseId === 'string' && UUID_RE.test(body.exerciseId) ? body.exerciseId : null

  if (!exerciseName || !prompt) {
    return NextResponse.json({ error: 'exerciseName et prompt requis' }, { status: 400 })
  }
  if (exerciseName.length > MAX_NAME || prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: 'exerciseName ou prompt trop long' }, { status: 400 })
  }
  if (generationType === 'image-to-video' && !referenceImageUrl) {
    return NextResponse.json({ error: 'referenceImageUrl requis pour image-to-video' }, { status: 400 })
  }
  if (referenceImageUrl && !/^https:\/\//.test(referenceImageUrl)) {
    return NextResponse.json({ error: 'referenceImageUrl doit être une URL https' }, { status: 400 })
  }

  const duration = Math.min(Math.max(Number(p.duration) || 5, 4), 15)
  const input: SeedanceInput = {
    prompt,
    generation_type: generationType,
    duration,
    aspect_ratio: ASPECT_RATIOS.has(p.aspectRatio) ? p.aspectRatio : '9:16',
    resolution: RESOLUTIONS.has(p.resolution) ? p.resolution : '1080p',
    seed: typeof p.seed === 'number' ? p.seed : -1,
  }
  if (generationType === 'image-to-video' && referenceImageUrl) {
    input.image_urls = [referenceImageUrl]
  }

  let taskId: string
  try {
    const created = await createTask(model, input)
    taskId = created.taskId
  } catch (e: any) {
    console.error('[seedance/generate] createTask failed:', e?.message)
    return NextResponse.json({ error: 'Échec de la création de la tâche Seedance' }, { status: 502 })
  }

  const { data, error } = await supabaseAdmin
    .from('seedance_jobs')
    .insert({
      created_by: admin.userId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      prompt,
      model,
      generation_type: generationType,
      params: input,
      reference_image_url: referenceImageUrl ?? null,
      task_id: taskId,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Insert job failed', taskId }, { status: 500 })
  }
  return NextResponse.json({ jobId: data.id, taskId })
}
