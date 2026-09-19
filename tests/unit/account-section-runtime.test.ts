import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountSection from '../../app/components/tabs/profile/AccountSection'

const mocks = vi.hoisted(() => ({ paymentHistory: vi.fn(() => null) }))
vi.mock('next-intl', () => ({ useLocale: () => 'fr', useTranslations: () => (key: string) => key }))
vi.mock('../../app/components/tabs/profile/PaymentHistory', () => ({ default: mocks.paymentHistory }))
vi.mock('../../app/components/tabs/profile/DeleteAccountSection', () => ({ default: () => null }))
vi.mock('../../app/components/Paywall', () => ({ default: () => null }))
vi.mock('../../components/ClientIntlProvider', () => ({ default: () => null }))
vi.mock('../../app/components/ui/SectionTitle', () => ({ default: () => null }))

const supabase = { auth: { signOut: vi.fn() } } as unknown as SupabaseClient
const session = { user: { id: 'client-test' } } as Session

function showAccount(endDate: string | null, authenticated = true) {
  return renderToStaticMarkup(React.createElement(AccountSection, {
    supabase,
    session: authenticated ? session : null,
    profile: { id: 'client-test', subscription_status: 'active', subscription_end_date: endDate },
    coachId: null,
    onBack: vi.fn(),
  }))
}

describe('account subscription rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-18T12:00:00Z'))
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rounds remaining days up when displaying an active subscription', () => {
    expect(showAccount('2026-09-19T12:00:30Z')).toMatch(/>2<\/span>/)
    expect(mocks.paymentHistory).toHaveBeenCalledWith(expect.objectContaining({ userId: 'client-test' }), undefined)
  })

  it('does not display a negative countdown after expiration', () => {
    expect(showAccount('2026-09-17T12:00:00Z')).toMatch(/>0<\/span>/)
  })

  it('does not invent an end date or request payment history without a session', () => {
    expect(showAccount(null, false)).not.toContain('subscription.renewalDate')
    expect(mocks.paymentHistory).not.toHaveBeenCalled()
  })
})
