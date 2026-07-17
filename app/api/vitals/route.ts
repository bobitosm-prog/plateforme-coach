import { NextRequest } from 'next/server'
import { validateJsonBody } from '@/lib/api/validation'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { webVitalSchema } from './schema'
import { recordWebVital } from './service'

/**
 * POST /api/vitals — Real User Monitoring for Core Web Vitals
 * Logs LCP, INP, CLS, FCP, TTFB from real users via sendBeacon.
 * No PII collected. Logged to Vercel stdout (visible in Vercel logs dashboard).
 */
export async function POST(req: NextRequest) {
  const observe = createApiRouteObservability(req, {
    event: 'WEB_VITAL_REQUEST', domain: 'vitals', operation: 'POST /api/vitals',
  })
  const validation = await validateJsonBody(req, webVitalSchema, { requireJsonContentType: false })
  if (!validation.ok) {
    return observe.complete(new Response(null, { status: 400 }), {
      outcome: 'rejected', reason: 'VALIDATION_ERROR',
    })
  }
  const metric = recordWebVital(validation.data)
  return observe.complete(new Response(null, { status: 204 }), {
    outcome: 'success', reason: 'COMPLETED', context: { metric: metric.metric, value: metric.roundedValue },
  })
}
