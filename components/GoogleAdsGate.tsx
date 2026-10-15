'use client'

import { useEffect } from 'react'
import { useConsent } from './CookieConsent'
import { enableGoogleAds } from '@/lib/marketing/google-ads'

export default function GoogleAdsGate() {
  const consent = useConsent()
  useEffect(() => {
    // Native iOS keeps account and health flows free of advertising tags.
    if ((window as Window & { __moovxNativeApp?: boolean }).__moovxNativeApp) return
    const isMarketingHost = ['moovx.ch', 'www.moovx.ch'].includes(window.location.hostname)
      || /^\/(fr|en|de)\/landing(?:\/|$)/.test(window.location.pathname)
    if (!isMarketingHost) return
    // Stripe's return URL contains a checkout session ID until the dashboard clears it.
    if (new URLSearchParams(window.location.search).has('session_id')) return
    if (consent?.marketing) enableGoogleAds(consent)
  }, [consent])
  return null
}
