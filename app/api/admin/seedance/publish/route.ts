import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { slugify } from '@/lib/seedance/slug'

export const dynamic = 'force-dynamic'
const BUCKET = 'exercise-videos'

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
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
  const dl = await fetch(job.video_url_remote)
  if (!dl.ok) {
    return NextResponse.json({ error: `Download échoué (${dl.status}) — URL peut-être expirée` }, { status: 502 })
  }
  const bytes = new Uint8Array(await dl.arrayBuffer())

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
