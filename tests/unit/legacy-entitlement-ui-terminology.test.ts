import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'

const read = (path: string) => readFileSync(path, 'utf8')

describe('legacy entitlement UI terminology', () => {
  it('labels historical subscription access without implying an active coach relation', () => {
    const account = read('app/components/tabs/profile/AccountSection.tsx')

    expect(account).toContain("t('subscription.legacyAccess')")
    expect(account).toContain("t('subscription.legacyAccessDesc')")
    expect(account).not.toContain("t('subscription.coachAccess')")
  })

  it('keeps the coach analytics cohort independent from subscription history', () => {
    const component = read('app/(application)/coach/components/CoachAnalytics.tsx')
    const hook = read('app/(application)/coach/hooks/useCoachAnalytics.ts')

    expect(component).not.toMatch(/subscription_type|['\"]invited['\"]/)
    expect(hook).not.toMatch(/subscription_type|['\"]invited['\"]/)
    expect(hook).toContain('listActiveClientsForCoach')
  })

  it('uses coach-managed terminology for the capability-derived Athena state', () => {
    const chat = read('app/components/ChatAI.tsx')

    expect(chat).toContain('capabilities.ai')
    expect(chat).toContain("t('coachManaged.title')")
    expect(chat).not.toMatch(/t\(['\"]invited\./)
  })

  it('presents legacy subscription statistics as historical access', () => {
    const admin = read('app/(application)/admin/page.tsx')
    const users = read('app/(application)/admin/users/_components/UsersTable.tsx')

    expect(admin).toContain('label="Accès historiques"')
    expect(admin).not.toContain('label="Invites"')
    expect(users).toContain('subscriptionLabel(u.subscription_type)')
  })

  it.each(['fr', 'en', 'de'])('separates UI terminology in %s translations', locale => {
    const messages = JSON.parse(read(`messages/${locale}.json`))

    expect(messages.chat.coachManaged).toBeDefined()
    expect(messages.chat.invited).toBeUndefined()
    expect(messages.profile.subscription.legacyAccess).toBeTruthy()
    expect(messages.profile.subscription.coachAccess).toBeUndefined()
    expect(messages.coach_dashboard.header.invited).toBeUndefined()
  })

  it('does not change the capability result for historical invited access', () => {
    expect(resolveUserCapabilities({ subscriptionType: 'invited' })).toEqual({
      ai: false,
      training: false,
      nutrition: false,
      coachManaged: true,
    })
  })
})
