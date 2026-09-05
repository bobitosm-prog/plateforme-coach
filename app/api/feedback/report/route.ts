export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  renderBugReportNotificationTemplate,
  resolveBugReportAdminEmail,
  sendEmail,
} from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

const ReportSchema = z.object({
  type: z.enum(['bug', 'amelioration', 'autre']),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
  page_url: z.string().trim().url().max(2048).optional(),
}).strict()

function failure(code: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, error: { code, message: 'Report unavailable' } },
    { status, headers },
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return failure('AUTH_REQUIRED', 401)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const userLimit = checkRateLimit(`bug-report:user:${user.id}`, 5, 15 * 60_000)
    const ipLimit = checkRateLimit(`bug-report:ip:${ip}`, 20, 15 * 60_000)
    if (!userLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(userLimit.retryAfter || 0, ipLimit.retryAfter || 0, 1)
      return failure('RATE_LIMITED', 429, { 'Retry-After': String(retryAfter) })
    }

    const parsed = ReportSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return failure('REPORT_INVALID', 400)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) return failure('REPORT_CREATION_FAILED', 500)

    const reporterRole = profile?.role || 'client'
    const { data: report, error: insertError } = await supabase
      .from('bug_reports')
      .insert({
        user_id: user.id,
        user_email: user.email || null,
        user_role: reporterRole,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        page_url: parsed.data.page_url || null,
      })
      .select('id,created_at')
      .single()

    if (insertError || !report) {
      console.error('[feedback/report] Report insertion failed')
      return failure('REPORT_CREATION_FAILED', 500)
    }

    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const adminUrl = configuredAppUrl
      ? `${configuredAppUrl.replace(/\/$/, '')}/admin/feedback`
      : null
    let notificationMethod: 'sent' | 'skipped' | 'error' = 'error'
    try {
      const notification = await sendEmail({
        to: resolveBugReportAdminEmail(),
        subject: '[MoovX] Nouveau signalement utilisateur',
        html: renderBugReportNotificationTemplate({
          reportId: report.id,
          createdAt: report.created_at,
          reportType: parsed.data.type,
          title: parsed.data.title,
          description: parsed.data.description,
          pageUrl: parsed.data.page_url,
          reporterEmail: user.email,
          reporterRole,
          adminUrl,
        }),
        fromName: 'MoovX Feedback',
      })
      notificationMethod = notification.method
    } catch {
      notificationMethod = 'error'
    }

    if (notificationMethod !== 'sent') {
      console.warn('[feedback/report] Admin notification not sent', {
        reportId: report.id,
        method: notificationMethod,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        notification: notificationMethod,
      },
    }, { status: 201 })
  } catch {
    console.error('[feedback/report] Unexpected failure')
    return failure('REPORT_CREATION_FAILED', 500)
  }
}
