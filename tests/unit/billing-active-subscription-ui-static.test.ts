import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('active platform subscription UI', () => {
  it('does not reopen the Paywall from the active subscription state', () => {
    const source = readFileSync('app/components/tabs/profile/AccountSection.tsx', 'utf8')
    const activeStart = source.indexOf("if (st === 'active' || st === 'trialing' || st === 'past_due')")
    const inactiveStart = source.indexOf("t('subscription.subscribePrompt')", activeStart)
    const activeBlock = source.slice(activeStart, inactiveStart)

    expect(activeStart).toBeGreaterThan(-1)
    expect(inactiveStart).toBeGreaterThan(activeStart)
    expect(activeBlock).toContain('subscription.manageSubscription')
    expect(activeBlock).toContain('disabled')
    expect(activeBlock).not.toContain('setShowPaywall(true)')
    expect(activeBlock).not.toContain('<Paywall')
  })

  it('keeps the purchase offers behind the inactive Paywall state', () => {
    const account = readFileSync('app/components/tabs/profile/AccountSection.tsx', 'utf8')
    const paywall = readFileSync('app/components/Paywall.tsx', 'utf8')

    expect(account).toContain('{showPaywall && (')
    expect(paywall).toContain("fetch('/api/stripe/checkout'")
  })
})
