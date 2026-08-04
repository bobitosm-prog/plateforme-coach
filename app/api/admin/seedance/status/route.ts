import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTask } from '@/lib/seedance/client'
import { resolveCorrelationId } from '@/lib/security/audit-log'
import { referenceObjectPathFromParams, removeSeedanceReference } from '@/lib/seedance/reference-storage'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const taskId = new URL(req.url).searchParams.get('taskId')?.trim()
  if (!taskId) {
    return NextResponse.json({ error: 'taskId requis' }, { status: 400 })
  }

  let result
  try {
    result = await getTask(taskId)
  } catch {
    console.error(JSON.stringify({ event: 'SEEDANCE_STATUS_FAILED', result: 'failed', errorCode: 'PROVIDER_STATUS_FAILED' }))
    return NextResponse.json({ error: 'Échec de la récupération du statut Seedance' }, { status: 502 })
  }

  await supabaseAdmin
    .from('seedance_jobs')
    .update({
      status: result.status,
      video_url_remote: result.videoUrl,
      error: result.failedReason,
    })
    .eq('task_id', taskId)

  if (result.status === 'failed') {
    const { data: job } = await supabaseAdmin
      .from('seedance_jobs')
      .select('params')
      .eq('task_id', taskId)
      .maybeSingle()
    const objectPath = referenceObjectPathFromParams(job?.params)
    if (objectPath) {
      try {
        await removeSeedanceReference(objectPath)
      } catch {
        console.error(JSON.stringify({
          event: 'SEEDANCE_REFERENCE_CLEANUP_FAILED',
          correlationId: resolveCorrelationId(req),
          bucket: 'seedance-references',
          hostClass: 'staging_https',
          result: 'failed',
          errorCode: 'CLEANUP_FAILED',
        }))
      }
    }
  }

  return NextResponse.json({ status: result.status, videoUrl: result.videoUrl })
}
