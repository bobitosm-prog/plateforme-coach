import { NextRequest } from 'next/server'

/**
 * POST /api/vitals — Real User Monitoring for Core Web Vitals
 * Logs LCP, INP, CLS, FCP, TTFB from real users via sendBeacon.
 * No PII collected. Logged to Vercel stdout (visible in Vercel logs dashboard).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, value, id, path } = body

    if (!name || value === undefined) {
      return new Response(null, { status: 400 })
    }

    // Log to stdout — visible in Vercel Functions logs
    console.log('[web-vital]', JSON.stringify({
      name,
      value: Math.round(value),
      id,
      path,
      ts: Date.now(),
    }))

    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 400 })
  }
}
