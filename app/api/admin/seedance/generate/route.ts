import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createTask, type SeedanceInput, type SeedanceModel, type SeedanceGenerationType } from '@/lib/seedance/client'

export const dynamic = 'force-dynamic'

const MODELS: SeedanceModel[] = ['seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini']

export async function POST(req: Request) {
  let admin: { userId: string; email: string }
  try {
    admin = await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : ''
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const model: SeedanceModel = MODELS.includes(body.model) ? body.model : 'seedance-2-0'
  const generationType: SeedanceGenerationType = body.generationType === 'image-to-video' ? 'image-to-video' : 'text-to-video'
  const p = body.params || {}
  const referenceImageUrl = typeof body.referenceImageUrl === 'string' ? body.referenceImageUrl : undefined

  if (!exerciseName || !prompt) {
    return NextResponse.json({ error: 'exerciseName et prompt requis' }, { status: 400 })
  }
  if (generationType === 'image-to-video' && !referenceImageUrl) {
    return NextResponse.json({ error: 'referenceImageUrl requis pour image-to-video' }, { status: 400 })
  }

  const input: SeedanceInput = {
    prompt,
    generation_type: generationType,
    duration: Number(p.duration) || 5,
    aspect_ratio: typeof p.aspectRatio === 'string' ? p.aspectRatio : '9:16',
    resolution: typeof p.resolution === 'string' ? p.resolution : '1080p',
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
    return NextResponse.json({ error: e.message || 'Seedance createTask failed' }, { status: 502 })
  }

  const { data, error } = await supabaseAdmin
    .from('seedance_jobs')
    .insert({
      created_by: admin.userId,
      exercise_id: typeof body.exerciseId === 'string' ? body.exerciseId : null,
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
