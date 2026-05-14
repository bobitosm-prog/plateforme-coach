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
  error?: string
}

/**
 * Envoi generique d'email via SMTP (Infomaniak par defaut).
 * Graceful degradation : si SMTP non configure, skip silencieux.
 */
export async function sendEmail({
  to, subject, html, replyTo, fromName = 'MoovX',
}: SendEmailOptions): Promise<SendResult> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP non configure, envoi skipped pour:', to)
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
    console.error('[email] Erreur envoi:', err)
    return {
      success: false,
      method: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
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
