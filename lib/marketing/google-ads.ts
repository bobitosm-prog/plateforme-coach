import type { ConsentChoice } from '@/components/CookieConsent'

const GOOGLE_ADS_ID = 'AW-18508943604'
const SUBSCRIPTION_SEND_TO = `${GOOGLE_ADS_ID}/AtUiCJemuZodEPSh4PlE`
const SCRIPT_ID = 'moovx-google-ads-tag'

type Gtag = (...args: unknown[]) => void
type GoogleWindow = Window & { dataLayer?: unknown[][]; gtag?: Gtag }

/** Load the Google tag only after explicit advertising consent. */
export function enableGoogleAds(consent: ConsentChoice): void {
  if (!consent.marketing || typeof window === 'undefined') return
  const googleWindow = window as GoogleWindow
  if (!googleWindow.gtag) {
    googleWindow.dataLayer = googleWindow.dataLayer || []
    googleWindow.gtag = (...args: unknown[]) => { googleWindow.dataLayer!.push(args) }
    googleWindow.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    })
  }
  googleWindow.gtag('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: consent.analytics ? 'granted' : 'denied',
  })
  if (!document.getElementById(SCRIPT_ID)) {
    googleWindow.gtag('js', new Date())
    googleWindow.gtag('config', GOOGLE_ADS_ID)
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
    document.head.appendChild(script)
  }
}

/** Payment IDs are used by Google Ads to deduplicate repeat page visits. */
export function reportSubscriptionConversion(payment: { id: string; amount: number }, consent: ConsentChoice): void {
  if (typeof window === 'undefined' || !consent.marketing || !payment.id || !Number.isFinite(payment.amount) || payment.amount <= 0) return
  enableGoogleAds(consent)
  ;(window as GoogleWindow).gtag?.('event', 'conversion', {
    send_to: SUBSCRIPTION_SEND_TO,
    value: payment.amount,
    currency: 'CHF',
    transaction_id: payment.id,
  })
}
