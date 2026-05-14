import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'
import { sendEmail, renderReplyTemplate } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const ReplySchema = z.object({
  reply: z.string().min(1, 'La reponse ne peut pas etre vide').max(5000, 'Reponse trop longue (max 5000 caracteres)'),
  send_email: z.boolean().default(true),
})

/**
 * POST /api/admin/bug-reports/[id]/reply
 *
 * Body : { reply: string, send_email?: boolean }
 *
 * Persiste la reponse en DB + envoie un email a l'utilisateur.
 * Status auto-update : 'new' → 'in_progress' si non deja resolu.
 */
export async function POST(
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
    const parsed = ReplySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Read le rapport pour l'email
    const { data: report, error: readError } = await supabaseAdmin
      .from('bug_reports')
      .select('id, title, type, user_id, user_email, user_role, status')
      .eq('id', id)
      .single()

    if (readError || !report) {
      return NextResponse.json({ error: 'Bug report not found' }, { status: 404 })
    }

    if (!report.user_email) {
      return NextResponse.json({
        error: 'Cannot reply: no email on this report'
      }, { status: 400 })
    }

    // Recupere le full_name pour personnaliser l'email
    let userName = report.user_email.split('@')[0]
    if (report.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', report.user_id)
        .single()
      if (profile?.full_name) {
        userName = profile.full_name.split(' ')[0]
      }
    }

    // Update DB : reply + status auto si necessaire
    const newStatus = (report.status === 'resolved' || report.status === 'wontfix')
      ? report.status
      : 'in_progress'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('bug_reports')
      .update({
        admin_reply: parsed.data.reply,
        replied_at: new Date().toISOString(),
        replied_by: admin.email,
        read_by_user: false,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, admin_reply, replied_at, replied_by, status, updated_at, read_by_user')
      .single()

    if (updateError) {
      console.error('[bug-reports/reply] DB update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send email (si demande)
    let emailResult: { method: string; error?: string } | null = null
    if (parsed.data.send_email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.moovx.ch'
      const html = renderReplyTemplate({
        userName,
        reportTitle: report.title,
        reportType: report.type,
        replyContent: parsed.data.reply,
        appUrl,
      })

      const result = await sendEmail({
        to: report.user_email,
        subject: `[MoovX] Reponse a : ${report.title.slice(0, 60)}`,
        html,
        replyTo: ADMIN_EMAIL,
      })

      emailResult = { method: result.method, ...(result.error ? { error: result.error } : {}) }
    }

    // Audit log async
    logAdminAction({
      action: 'bug_report_reply',
      target_user_id: report.user_id || report.id,
      target_email: report.user_email,
      actor_email: admin.email,
      metadata: {
        report_id: report.id,
        report_title: report.title,
        reply_length: parsed.data.reply.length,
        email_sent: parsed.data.send_email,
        email_method: emailResult?.method || 'skipped',
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      report: updated,
      email: emailResult,
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
