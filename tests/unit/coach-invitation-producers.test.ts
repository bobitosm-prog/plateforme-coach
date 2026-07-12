import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = [
  'app/coach/page.tsx',
  'app/coach/hooks/useCoachDashboard.ts',
  'app/coach/components/ClientsList.tsx',
  'app/onboarding-coach/OnboardingCoachContent.tsx',
  'app/api/invite-client/route.ts',
]

describe('verified coach invitation producers', () => {
  it('contains no historical UUID join-link producer', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toContain('/join?coach=')
    }
  })

  it('uses only the verified creation endpoint from the coach UI', () => {
    const page = readFileSync('app/coach/page.tsx', 'utf8')
    expect(page).toContain("fetch('/api/coach/invitations'")
    expect(page).toContain("fetch('/api/coach/invitations/revoke'")
    expect(page).not.toContain("fetch('/api/invite-client'")
    expect(page).not.toContain('inviteLink:')
    expect(page).not.toContain("window.open('mailto:")
  })
})
