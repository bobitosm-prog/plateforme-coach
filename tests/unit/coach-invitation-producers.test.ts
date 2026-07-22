import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = [
  'app/coach/page.tsx',
  'app/coach/components/CoachPageContent.tsx',
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
    const content = readFileSync('app/coach/components/CoachPageContent.tsx', 'utf8')
    expect(content).toContain("fetch('/api/coach/invitations'")
    expect(content).toContain("fetch('/api/coach/invitations/revoke'")
    expect(content).not.toContain("fetch('/api/invite-client'")
    expect(content).not.toContain('inviteLink:')
    expect(content).not.toContain("window.open('mailto:")
  })
})
