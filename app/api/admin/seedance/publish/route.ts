import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { slugify } from '@/lib/seedance/slug'

export const dynamic = 'force-dynamic'
const BUCKET = 'exercise-videos'
const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100 MB : borne la mémoire lambda

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`seedance-pub:${ip}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de publications, réessaie dans une minute' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const jobId = typeof body.jobId === 'string' ? body.jobId : ''
  if (!jobId) return NextResponse.json({ error: 'jobId requis' }, { status: 400 })

  const { data: job, error: jobErr } = await supabaseAdmin
    .from('seedance_jobs')
    .select('id, exercise_id, exercise_name, status, video_url_remote')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job introuvable' }, { status: 404 })
  if (job.status !== 'completed' || !job.video_url_remote) {
    return NextResponse.json({ error: 'Job non prêt à publier' }, { status: 409 })
  }

  // 1. Download remote video (URL expirable)
  // Défense en profondeur : n'accepter qu'une URL https (l'URL vient de l'API
  // Seedance via la route status, mais on borne quand même le schéma).
  if (!/^https:\/\//.test(job.video_url_remote)) {
    return NextResponse.json({ error: 'URL vidéo distante invalide' }, { status: 400 })
  }
  const dl = await fetch(job.video_url_remote)
  if (!dl.ok) {
    return NextResponse.json({ error: `Download échoué (${dl.status}) — URL peut-être expirée` }, { status: 502 })
  }
  // Borne la taille avant de bufferiser en mémoire (OOM lambda).
  const declaredSize = Number(dl.headers.get('content-length') || 0)
  if (declaredSize > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Vidéo distante trop volumineuse' }, { status: 502 })
  }
  const buf = await dl.arrayBuffer()
  if (buf.byteLength > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'Vidéo distante trop volumineuse' }, { status: 502 })
  }
  const bytes = new Uint8Array(buf)

  // 2. Upload to bucket at {slug}/{slug}.mp4
  const slug = slugify(job.exercise_name)
  const storagePath = `${slug}/${slug}.mp4`
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: 'video/mp4', upsert: true })
  if (upErr) return NextResponse.json({ error: `Upload échoué : ${upErr.message}` }, { status: 500 })

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  const publishedVideoUrl = `${pub.publicUrl}?v=${Date.now()}`

  // 3. Update exercises_db.video_url (si l'exo est lié)
  if (job.exercise_id) {
    const { error: exErr } = await supabaseAdmin
      .from('exercises_db')
      .update({ video_url: publishedVideoUrl })
      .eq('id', job.exercise_id)
    if (exErr) return NextResponse.json({ error: `Update exercice échoué : ${exErr.message}` }, { status: 500 })
  }

  // 4. Mark job published
  await supabaseAdmin
    .from('seedance_jobs')
    .update({ published_video_url: publishedVideoUrl })
    .eq('id', jobId)

  return NextResponse.json({ publishedVideoUrl })
}
