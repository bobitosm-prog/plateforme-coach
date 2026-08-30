import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { invitationTerminalState } from '@/app/(application)/join/invitation-state'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Wave 6F invitation continuity', () => {
  const join = read('app/(application)/join/JoinPageContent.tsx')
  const intent = read('app/api/coach/invitations/intent/route.ts')
  const callback = read('app/auth/callback/route.ts')
  const validate = read('app/api/coach/invitations/validate/route.ts')

  it('stores same-device intent in a short-lived HttpOnly cookie', () => {
    expect(intent).toContain("httpOnly: true")
    expect(intent).toContain("sameSite: 'lax'")
    expect(intent).toContain('MAX_AGE_SECONDS')
    expect(join).toContain("fetch('/api/coach/invitations/intent'")
    expect(join).toContain("method: 'DELETE'")
  })

  it('resumes the join contract after email confirmation and manual login', () => {
    expect(join).toContain('/auth/callback?next=/join')
    expect(callback).toContain("next === '/join'")
    expect(callback).toContain('&next=%2Fjoin')
  })

  it('exposes only a masked invitation target and preserves terminal states', () => {
    expect(validate).toContain('maskedEmail')
    expect(validate).not.toContain('data: { valid: true, expiresAt: data.expires_at, recipient_email')
    expect(invitationTerminalState('INVITATION_EXPIRED')).toBe('expired')
    expect(invitationTerminalState('INVITATION_REVOKED')).toBe('revoked')
    expect(invitationTerminalState('INVITATION_ALREADY_USED')).toBe('used')
    expect(invitationTerminalState('INVITATION_EMAIL_MISMATCH')).toBe('email-mismatch')
    expect(invitationTerminalState('INVITATION_ACTIVE_COACH_CONFLICT')).toBe('coach-conflict')
    expect(invitationTerminalState('INVITATION_INVALID')).toBe('invalid')
  })

  it('does not persist raw invitation tokens in the database', () => {
    expect(intent).not.toMatch(/supabase|\.from\(|\.insert\(|\.upsert\(/)
    expect(validate).toContain('hashCoachInvitationToken')
  })
})
