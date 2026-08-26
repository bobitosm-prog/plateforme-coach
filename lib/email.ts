import 'server-only'
import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
  fromName?: string
}

interface SendResult {
  success: boolean
  method: 'sent' | 'skipped' | 'error'
  errorCode?: string
  error?: string
}

function resolveEmailErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) return code
  }

  return error instanceof Error && /^[A-Za-z0-9_]+$/.test(error.name)
    ? error.name
    : 'UNKNOWN_EMAIL_ERROR'
}

/**
 * Envoi generique d'email via SMTP (Infomaniak par defaut).
 * Graceful degradation : si SMTP non configure, skip silencieux.
 */
export async function sendEmail({
  to, subject, html, replyTo, fromName = 'MoovX',
}: SendEmailOptions): Promise<SendResult> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP non configure, envoi skipped')
    return { success: true, method: 'skipped' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.infomaniak.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"${fromName}" <noreply@moovx.ch>`,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    })

    return { success: true, method: 'sent' }
  } catch (err) {
    const errorCode = resolveEmailErrorCode(err)
    console.error('[email] Envoi echoue', { emailMethod: 'error', errorCode })
    return {
      success: false,
      method: 'error',
      errorCode,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

const BUG_REPORT_ADMIN_EMAIL_FALLBACK = 'bobitosm@gmail.com'

export function resolveBugReportAdminEmail(
  configuredEmail = process.env.BUG_REPORT_ADMIN_EMAIL,
): string {
  return configuredEmail?.trim() || BUG_REPORT_ADMIN_EMAIL_FALLBACK
}

interface BugReportNotificationTemplateData {
  reportId: string
  createdAt: string
  reportType: 'bug' | 'amelioration' | 'autre'
  title: string
  description: string
  pageUrl?: string | null
  reporterEmail?: string | null
  reporterRole: string
  adminUrl?: string | null
}

export function renderBugReportNotificationTemplate({
  reportId,
  createdAt,
  reportType,
  title,
  description,
  pageUrl,
  reporterEmail,
  reporterRole,
  adminUrl,
}: BugReportNotificationTemplateData): string {
  const safeReportId = escapeHtml(reportId)
  const safeCreatedAt = escapeHtml(createdAt)
  const safeType = escapeHtml(reportType)
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description).replace(/\n/g, '<br>')
  const safePageUrl = pageUrl ? escapeHtml(pageUrl) : null
  const safeReporterEmail = reporterEmail ? escapeHtml(reporterEmail) : null
  const safeReporterRole = escapeHtml(reporterRole)
  const safeAdminUrl = adminUrl ? escapeHtml(adminUrl) : null

  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#0D0B08;font-family:Arial,sans-serif;color:#F5EDD8">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <h1 style="color:#D4A843;letter-spacing:3px;text-align:center">NOUVEAU SIGNALEMENT</h1>
    <div style="background:#141209;border:1px solid rgba(212,168,67,.2);border-radius:12px;padding:24px">
      <p><strong>ID :</strong> ${safeReportId}</p>
      <p><strong>Date :</strong> ${safeCreatedAt}</p>
      <p><strong>Catégorie :</strong> ${safeType}</p>
      <p><strong>Rôle :</strong> ${safeReporterRole}</p>
      ${safeReporterEmail ? `<p><strong>Reporter :</strong> ${safeReporterEmail}</p>` : ''}
      <h2 style="color:#D4A843;font-size:18px">${safeTitle}</h2>
      <p style="line-height:1.6">${safeDescription}</p>
      ${safePageUrl ? `<p><strong>Page :</strong> <a style="color:#D4A843" href="${safePageUrl}">${safePageUrl}</a></p>` : ''}
    </div>
    ${safeAdminUrl ? `<p style="text-align:center;margin-top:24px"><a href="${safeAdminUrl}" style="display:inline-block;padding:14px 28px;background:#D4A843;color:#0D0B08;font-weight:700;text-decoration:none;border-radius:12px">Ouvrir l'administration</a></p>` : ''}
  </div>
</body></html>`
}

/**
 * Echappe les caracteres HTML pour insertion safe dans un template.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ReplyTemplateData {
  userName: string
  reportTitle: string
  reportType: 'bug' | 'amelioration' | 'autre' | string
  replyContent: string
  appUrl: string
}

const TYPE_LABEL: Record<string, string> = {
  bug: 'rapport de bug',
  amelioration: 'suggestion',
  autre: 'message',
}

/**
 * Genere le HTML branded pour une reponse a un bug_report.
 * Style aligne MoovX : bg #0D0B08, gold #D4A843.
 */
export function renderReplyTemplate({
  userName, reportTitle, reportType, replyContent, appUrl,
}: ReplyTemplateData): string {
  const typeLabel = TYPE_LABEL[reportType] || 'message'
  const safeName = escapeHtml(userName)
  const safeTitle = escapeHtml(reportTitle)
  const safeReply = escapeHtml(replyContent).replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Reponse de MoovX</title>
</head>
<body style="margin:0;padding:0;background:#0D0B08;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0B08;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#141209;border-radius:16px;overflow:hidden;border:1px solid rgba(212,168,67,0.15);">

        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <div style="font-size:30px;letter-spacing:3px;color:#D4A843;font-weight:bold;text-transform:uppercase;">MOOVX</div>
        </td></tr>

        <tr><td style="padding:8px 32px 24px;">
          <div style="background:rgba(212,168,67,0.05);border-left:3px solid #D4A843;padding:14px 18px;border-radius:8px;">
            <div style="color:#99907e;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;font-weight:600;">Votre ${typeLabel}</div>
            <div style="color:#e5e2e1;font-size:15px;font-weight:600;">${safeTitle}</div>
          </div>
        </td></tr>

        <tr><td style="padding:8px 32px 0;color:#e5e2e1;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;">Bonjour ${safeName},</p>
          <p style="margin:0 0 18px;color:#d0c5b2;">Merci pour votre retour. Voici notre reponse :</p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <div style="background:#1a1817;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:20px 24px;color:#e5e2e1;font-size:14px;line-height:1.7;">
            ${safeReply}
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${appUrl}" style="display:inline-block;background:#D4A843;color:#0D0B08;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">Ouvrir MoovX</a>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;color:#5a5246;font-size:11px;line-height:1.6;">
          Repondez directement a ce mail pour continuer la conversation.<br>
          MoovX · Plateforme de coaching personnalise
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
