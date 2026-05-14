import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'

export const dynamic = 'force-dynamic'

const StatusSchema = z.union([
  z.enum(['nouveau', 'en_cours', 'resolu', 'rejete']),
  z.null(),
]).optional()

const PrioritySchema = z.union([
  z.enum(['basse', 'normal', 'haute', 'critique']),
  z.null(),
]).optional()

const PatchSchema = z.object({
  status: StatusSchema,
  priority: PrioritySchema,
  admin_notes: z.union([z.string().max(2000), z.null()]).optional(),
})

/**
 * PATCH /api/admin/bug-reports/[id]
 * Body : { status?, priority?, admin_notes? }
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req)
    const { id } = await context.params

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)

    if (process.env.NODE_ENV === 'development') {
      console.log('[bug-reports PATCH] Body recu:', JSON.stringify(body))
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      console.error('[bug-reports PATCH] Zod issues:', issues)
      return NextResponse.json(
        {
          error: issues.length > 0 ? issues.join(' · ') : 'Invalid body',
          details: parsed.error.flatten(),
          received: body,
        },
        { status: 400 }
      )
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) patch.status = parsed.data.status
    if (parsed.data.priority !== undefined) {
      patch.priority = parsed.data.priority
    }
    if (parsed.data.admin_notes !== undefined) patch.admin_notes = parsed.data.admin_notes

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No field to update' }, { status: 400 })
    }

    patch.updated_at = new Date().toISOString()

    // Read before for audit diff
    const { data: current, error: readError } = await supabaseAdmin
      .from('bug_reports')
      .select('id, title, user_email, status, priority, admin_notes')
      .eq('id', id)
      .single()

    if (readError || !current) {
      return NextResponse.json({ error: 'Bug report not found' }, { status: 404 })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('bug_reports')
      .update(patch)
      .eq('id', id)
      .select('id, title, status, priority, admin_notes, updated_at')
      .single()

    if (updateError) {
      console.error('[admin/bug-reports PATCH]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    logAdminAction({
      action: 'bug_report_update',
      target_user_id: current.id,
      target_email: current.user_email || 'unknown',
      actor_email: admin.email,
      metadata: {
        title: current.title,
        old: {
          status: current.status,
          priority: current.priority,
          admin_notes: current.admin_notes,
        },
        new: parsed.data,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, report: updated })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
