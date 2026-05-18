'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Real User Monitoring — Core Web Vitals
 * Reports LCP, INP, CLS, FCP, TTFB to /api/vitals via sendBeacon.
 * No PII. Conditioned on analytics consent (cookie moovx_consent).
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Respect cookie consent — only send if analytics accepted
    const consentMatch = document.cookie.match(/moovx_consent=([^;]+)/)
    if (consentMatch) {
      try {
        const consent = JSON.parse(decodeURIComponent(consentMatch[1]))
        if (!consent.analytics) return
      } catch {
        return
      }
    }
    // No consent cookie at all = first visit, don't send (RGPD safe)
    if (!consentMatch) return

    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      path: window.location.pathname,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body)
    } else {
      fetch('/api/vitals', { body, method: 'POST', keepalive: true })
    }
  })

  return null
}
