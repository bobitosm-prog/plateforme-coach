import { randomBytes } from 'node:crypto'
import { z } from 'zod'

export const COACH_INVITATION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

export const createCoachInvitationSchema = z.object({
  recipientEmail: z.string().min(3).max(254),
  locale: z.enum(['fr', 'en', 'de', 'it']).optional(),
}).strict()

export const revokeCoachInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
}).strict()

export function normalizeCoachInvitationEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase()
}

export function isValidCoachInvitationEmail(email: string): boolean {
  if (/\p{Cc}/u.test(email)) return false
  return z.email().max(254).safeParse(email).success
}

export function createCoachInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderCoachInvitationEmail({ coachName, joinUrl }: { coachName: string; joinUrl: string }) {
  const safeCoachName = escapeHtml(coachName || 'Ton coach')
  const safeJoinUrl = escapeHtml(joinUrl)
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#0D0B08;font-family:Arial,sans-serif;color:#F5EDD8">
  <div style="max-width:520px;margin:0 auto;padding:40px 32px">
    <h1 style="color:#D4A843;letter-spacing:4px;text-align:center">MOOVX</h1>
    <div style="background:#141209;border:1px solid rgba(212,168,67,.2);border-radius:12px;padding:24px;margin:24px 0">
      <p><strong style="color:#D4A843">${safeCoachName}</strong> t'invite à rejoindre MoovX pour ton coaching personnalisé.</p>
      <p style="color:#8A8070">Cette invitation personnelle expire dans 7 jours et ne peut être utilisée qu'une fois.</p>
    </div>
    <p style="text-align:center"><a href="${safeJoinUrl}" style="display:inline-block;padding:16px 40px;background:#D4A843;color:#0D0B08;font-weight:700;text-decoration:none;border-radius:12px">Rejoindre MoovX</a></p>
  </div>
</body></html>`
}
