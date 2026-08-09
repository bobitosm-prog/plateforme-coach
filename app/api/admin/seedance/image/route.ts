import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateImage } from '@/lib/gemini/image'
import { slugify } from '@/lib/seedance/slug'
import { resolveCorrelationId } from '@/lib/security/audit-log'
import { generateSeedanceText } from '@/lib/seedance/anthropic'
import {
  isSeedanceReferenceStorageEnabled,
  SeedanceReferenceStorageError,
  uploadSeedanceReference,
} from '@/lib/seedance/reference-storage'

export const dynamic = 'force-dynamic'
const BUCKET = 'exercise-videos'

// Style cinématique figé, appliqué à TOUTES les images de référence (validé par Marco).
const STYLE_SUFFIX =
  'Dark moody gym, dramatic rim lighting, atmospheric haze, cinematic side 3/4 angle, ' +
  'vertical 9:16 composition, photorealistic, hyperrealistic, high detail, no on-screen text.'

function isExplicitLocalStorageFallbackAllowed(): boolean {
  if (
    process.env.NODE_ENV !== 'development'
    || process.env.SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED !== 'true'
  ) {
    return false
  }

  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '')
    return url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && url.port !== ''
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

async function buildImagePrompt(req: Request, exerciseName: string, muscleGroup: string, equipment: string): Promise<string> {
  const generated = await generateSeedanceText({
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    correlationId: resolveCorrelationId(req),
    maxTokens: 300,
    prompt: `Décris en anglais, en 1 à 2 phrases, la POSITION DE DÉPART correcte d'un athlète masculin réaliste exécutant l'exercice de musculation "${exerciseName}" (groupe musculaire : ${muscleGroup || 'non précisé'}, équipement : ${equipment || 'non précisé'}). Précise la machine/équipement, la position du corps et la prise, de façon anatomiquement correcte. Réponds UNIQUEMENT avec cette description, sans préambule ni guillemets.`,
    signal: req.signal,
  })
  if (!generated.ok) throw new Error('SEEDANCE_IMAGE_PROMPT_PROVIDER_FAILED')
  const desc = generated.value.trim()
  return `Photorealistic cinematic photo. ${desc} ${STYLE_SUFFIX}`
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`seedance-img:${ip}`, 15, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessaie dans une minute' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim().slice(0, 200) : ''
  if (!exerciseName) {
    return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })
  }
  const muscleGroup = typeof body.muscleGroup === 'string' ? body.muscleGroup.slice(0, 100) : ''
  const equipment = typeof body.equipment === 'string' ? body.equipment.slice(0, 100) : ''
  const customPrompt = typeof body.imagePrompt === 'string' ? body.imagePrompt.trim().slice(0, 2000) : ''

  const useReferenceStorage = isSeedanceReferenceStorageEnabled()
  const useLocalStorageFallback = !useReferenceStorage && isExplicitLocalStorageFallbackAllowed()
  if (!useReferenceStorage && !useLocalStorageFallback) {
    return NextResponse.json({ error: 'Stockage de référence Seedance indisponible' }, { status: 503 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  let imagePrompt: string
  try {
    imagePrompt = customPrompt || await buildImagePrompt(req, exerciseName, muscleGroup, equipment)
  } catch {
    console.error(JSON.stringify({ event: 'SEEDANCE_IMAGE_PROMPT_FAILED', result: 'failed', errorCode: 'PROMPT_BUILD_FAILED' }))
    return NextResponse.json({ error: 'Échec de la construction du prompt image' }, { status: 502 })
  }

  let image
  try {
    image = await generateImage(imagePrompt)
  } catch {
    console.error(JSON.stringify({ event: 'SEEDANCE_IMAGE_GENERATION_FAILED', result: 'failed', errorCode: 'IMAGE_PROVIDER_FAILED' }))
    return NextResponse.json({ error: 'Échec de la génération de l\'image' }, { status: 502 })
  }

  if (useReferenceStorage) {
    const correlationId = resolveCorrelationId(req)
    try {
      const reference = await uploadSeedanceReference({
        bytes: image.bytes,
        mimeType: image.mimeType,
        correlationId,
      })
      return NextResponse.json({
        imageUrl: reference.signedUrl,
        imagePrompt,
        expiresAt: reference.expiresAt,
      })
    } catch (error: unknown) {
      console.error(JSON.stringify({
        event: 'SEEDANCE_REFERENCE_UPLOAD_FAILED',
        correlationId,
        bucket: 'seedance-references',
        hostClass: 'staging_https',
        mime: image.mimeType,
        size: image.bytes.byteLength,
        result: 'failed',
        errorCode: error instanceof SeedanceReferenceStorageError ? error.code : 'UNKNOWN_ERROR',
      }))
      return NextResponse.json({ error: 'Upload temporaire Seedance échoué' }, { status: 500 })
    }
  }

  const slug = slugify(exerciseName)
  const ext = image.mimeType === 'image/png' ? 'png' : 'jpg'
  const storagePath = `${slug}/ref-${Date.now()}.${ext}`
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, image.bytes, { contentType: image.mimeType, upsert: true })
  if (upErr) {
    return NextResponse.json({ error: `Upload image échoué : ${upErr.message}` }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  return NextResponse.json({ imageUrl: pub.publicUrl, imagePrompt })
}
