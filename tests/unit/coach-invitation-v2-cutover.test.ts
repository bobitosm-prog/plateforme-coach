import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Invitation V2 application cutover', () => {
  it('uses only opaque-token join links and rejects legacy coach UUID links', () => {
    const join = read('app/(application)/join/JoinPageContent.tsx')
    const coachSources = [
      read('app/(application)/coach/page.tsx'),
      read('app/(application)/coach/hooks/useCoachDashboard.ts'),
      read('app/(application)/onboarding-coach/OnboardingCoachContent.tsx'),
    ].join('\n')

    expect(join).toContain("params.get('coach')")
    expect(join).toContain("params.get('token')")
    expect(join).toContain("sessionStorage.setItem(STORAGE_KEY, urlToken)")
    expect(coachSources).not.toContain('/join?coach=')
    expect(coachSources).not.toContain('inviteLink')
  })

  it('uses one creation authority and disables the browser-provided legacy email route', () => {
    const coach = read('app/(application)/coach/page.tsx')
    const legacy = read('app/api/invite-client/route.ts')
    expect(coach).toContain("fetch('/api/coach/invitations'")
    expect(coach).not.toContain("fetch('/api/invite-client'")
    expect(legacy).toContain('INVITATION_LEGACY_DISABLED')
    expect(legacy).not.toMatch(/inviteLink|coachName|clientEmail/)
  })

  it('preserves the token only until authenticated callback consumption', () => {
    const join = read('app/(application)/join/JoinPageContent.tsx')
    const callback = read('app/auth/callback/route.ts')
    const login = read('app/(application)/login/LoginPageContent.tsx')
    expect(join).toContain('/auth/callback?next=/join')
    expect(join).toContain("fetch('/api/coach/invitations/consume'")
    expect(join).toContain('supabase.auth.getSession()')
    expect(callback).toContain("!requestedNext.startsWith('//')")
    expect(login).toContain("searchParams.get('next') === '/join'")
  })

  it('contains no entitlement mutation in invitation runtime sources', () => {
    const runtime = [
      'app/api/coach/invitations/route.ts',
      'app/api/coach/invitations/consume/route.ts',
      'app/api/coach/invitations/revoke/route.ts',
      'lib/coach-invitations/service.ts',
    ].map(read).join('\n')
    expect(runtime).not.toMatch(/subscription_type|subscription_status|trial_ends_at|stripe_|entitlement/i)
  })
})
