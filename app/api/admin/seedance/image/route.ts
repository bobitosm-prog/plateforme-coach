import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateImage } from '@/lib/gemini/image'
import { slugify } from '@/lib/seedance/slug'

export const dynamic = 'force-dynamic'
const BUCKET = 'exercise-videos'

// Style cinématique figé, appliqué à TOUTES les images de référence (validé par Marco).
const STYLE_SUFFIX =
  'Dark moody gym, dramatic rim lighting, atmospheric haze, cinematic side 3/4 angle, ' +
  'vertical 9:16 composition, photorealistic, hyperrealistic, high detail, no on-screen text.'

async function buildImagePrompt(anthropic: Anthropic, exerciseName: string, muscleGroup: string, equipment: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Décris en anglais, en 1 à 2 phrases, la POSITION DE DÉPART correcte d'un athlète masculin réaliste exécutant l'exercice de musculation "${exerciseName}" (groupe musculaire : ${muscleGroup || 'non précisé'}, équipement : ${equipment || 'non précisé'}). Précise la machine/équipement, la position du corps et la prise, de façon anatomiquement correcte. Réponds UNIQUEMENT avec cette description, sans préambule ni guillemets.`,
    }],
  })
  const desc = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let imagePrompt: string
  try {
    imagePrompt = customPrompt || await buildImagePrompt(anthropic, exerciseName, muscleGroup, equipment)
  } catch (e: any) {
    console.error('[seedance/image] prompt build failed:', e?.message)
    return NextResponse.json({ error: 'Échec de la construction du prompt image' }, { status: 502 })
  }

  let image
  try {
    image = await generateImage(imagePrompt)
  } catch (e: any) {
    console.error('[seedance/image] Gemini failed:', e?.message)
    return NextResponse.json({ error: 'Échec de la génération de l\'image' }, { status: 502 })
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
