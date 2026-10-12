import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConsentChoice } from '@/components/CookieConsent'
import { enableGoogleAds, reportSubscriptionConversion } from '@/lib/marketing/google-ads'

const consent: ConsentChoice = {
  necessary: true,
  analytics: false,
  functional: true,
  marketing: true,
  timestamp: 1,
  version: '2.0',
}

describe('Google Ads conversion tag', () => {
  const scripts: Array<{ id: string; async: boolean; src: string }> = []
  beforeEach(() => {
    scripts.length = 0
    vi.stubGlobal('window', {})
    vi.stubGlobal('document', {
      getElementById: (id: string) => scripts.find(script => script.id === id) || null,
      createElement: () => ({ id: '', async: false, src: '' }),
      head: { appendChild: (script: { id: string; async: boolean; src: string }) => { scripts.push(script) } },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('loads nothing without advertising consent', () => {
    enableGoogleAds({ ...consent, marketing: false })
    reportSubscriptionConversion({ id: 'payment-1', amount: 10 }, { ...consent, marketing: false })
    expect(scripts).toHaveLength(0)
    expect((window as Window & { dataLayer?: unknown }).dataLayer).toBeUndefined()
  })

  it('queues consent before the tag and sends only a confirmed payment ID and amount', () => {
    enableGoogleAds(consent)
    reportSubscriptionConversion({ id: 'payment-1', amount: 10 }, consent)
    const calls = (window as unknown as { dataLayer: unknown[][] }).dataLayer
    expect(calls[0]).toEqual(['consent', 'default', expect.objectContaining({ ad_storage: 'denied' })])
    expect(calls[1]).toEqual(['consent', 'update', expect.objectContaining({ ad_storage: 'granted', ad_personalization: 'denied' })])
    expect(calls.find(call => call[0] === 'event')).toEqual([
      'event', 'conversion', {
        send_to: 'AW-18508943604/AtUiCJemuZodEPSh4PlE',
        value: 10,
        currency: 'CHF',
        transaction_id: 'payment-1',
      },
    ])
    expect(scripts).toEqual([{ id: 'moovx-google-ads-tag', async: true, src: 'https://www.googletagmanager.com/gtag/js?id=AW-18508943604' }])
  })
})
