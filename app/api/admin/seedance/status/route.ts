import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTask } from '@/lib/seedance/client'

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Seedance getTask failed' }, { status: 502 })
  }

  await supabaseAdmin
    .from('seedance_jobs')
    .update({
      status: result.status,
      video_url_remote: result.videoUrl,
      error: result.failedReason,
    })
    .eq('task_id', taskId)

  return NextResponse.json({ status: result.status, videoUrl: result.videoUrl })
}
