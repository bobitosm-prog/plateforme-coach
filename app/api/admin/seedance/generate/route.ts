import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { resolveCorrelationId } from '@/lib/security/audit-log'
import {
  createTask,
  getSeedanceProviderFailure,
  type SeedanceInput,
  type SeedanceModel,
  type SeedanceGenerationType,
} from '@/lib/seedance/client'
import {
  classifySeedanceReferenceUrl,
  objectPathFromSignedReferenceUrl,
  removeSeedanceReference,
} from '@/lib/seedance/reference-storage'

export const dynamic = 'force-dynamic'

const MODELS: SeedanceModel[] = ['seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini']
const ASPECT_RATIOS = new Set(['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', 'adaptive'])
const RESOLUTIONS = new Set(['480p', '720p', '1080p', '4k'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_PROMPT = 2000
const MAX_NAME = 200

function isAllowedReferenceImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true

    return process.env.NODE_ENV === 'development'
      && url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && url.port !== ''
  } catch {
    return false
  }
}

function referenceImageContext(value: string | undefined) {
  if (!value) return { referenceImageScheme: 'none', referenceImageHostClass: null }
  const url = new URL(value)
  const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  return {
    referenceImageScheme: url.protocol.slice(0, -1),
    referenceImageHostClass: local ? 'local' : 'public_https',
  }
}

async function cleanupReference(objectPath: string | null, correlationId: string): Promise<void> {
  if (!objectPath) return
  try {
    await removeSeedanceReference(objectPath)
  } catch {
    console.error(JSON.stringify({
      event: 'SEEDANCE_REFERENCE_CLEANUP_FAILED',
      correlationId,
      bucket: 'seedance-references',
      hostClass: 'staging_https',
      result: 'failed',
      errorCode: 'CLEANUP_FAILED',
    }))
  }
}

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
  if (referenceImageUrl && !isAllowedReferenceImageUrl(referenceImageUrl)) {
    return NextResponse.json({ error: 'referenceImageUrl doit être une URL https ou une URL HTTP locale en développement' }, { status: 400 })
  }

  const correlationId = resolveCorrelationId(req)
  let referenceObjectPath: string | null = null
  if (referenceImageUrl) {
    try {
      if (classifySeedanceReferenceUrl(referenceImageUrl) === 'staging_https') {
        referenceObjectPath = objectPathFromSignedReferenceUrl(referenceImageUrl)
      }
    } catch {
      return NextResponse.json({ error: 'referenceImageUrl non autorisée' }, { status: 400 })
    }
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
  } catch (error: unknown) {
    await cleanupReference(referenceObjectPath, correlationId)
    const failure = getSeedanceProviderFailure(error)
    console.error(JSON.stringify({
      event: 'SEEDANCE_PROVIDER_FAILURE',
      status: failure.status,
      providerErrorType: failure.providerErrorType,
      ...(failure.providerErrorCode ? { providerErrorCode: failure.providerErrorCode } : {}),
      requestedModel: model,
      taskOperation: 'createTask',
      correlationId,
      ...referenceImageContext(referenceImageUrl),
    }))
    return NextResponse.json({ error: 'Échec de la création de la tâche Seedance' }, { status: 502 })
  }

  const persistedInput = { ...input }
  delete persistedInput.image_urls
  const persistedParams = referenceObjectPath
    ? { ...persistedInput, seedance_reference_path: referenceObjectPath }
    : persistedInput

  const { data, error } = await supabaseAdmin
    .from('seedance_jobs')
    .insert({
      created_by: admin.userId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      prompt,
      model,
      generation_type: generationType,
      params: persistedParams,
      reference_image_url: referenceObjectPath ? null : referenceImageUrl ?? null,
      task_id: taskId,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error || !data) {
    await cleanupReference(referenceObjectPath, correlationId)
    return NextResponse.json({ error: error?.message || 'Insert job failed', taskId }, { status: 500 })
  }
  return NextResponse.json({ jobId: data.id, taskId })
}
