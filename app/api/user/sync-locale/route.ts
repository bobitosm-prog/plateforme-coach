import { NextResponse } from 'next/server'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { readSessionLocale } from './service'

const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function POST(request: Request) {
  const observe = createApiRouteObservability(request, {
    event: 'LOCALE_SYNC_REQUEST', domain: 'locale', operation: 'POST /api/user/sync-locale',
  })
  const result = await readSessionLocale()
  if (!result.ok) {
    if (result.code === 'AUTH_REQUIRED') {
      return observe.complete(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), {
        outcome: 'rejected', reason: result.code,
      })
    }
    return observe.complete(NextResponse.json({ success: false }, { status: 200 }), {
      outcome: 'failed', reason: result.code,
    })
  }
  if (!result.locale) {
    return observe.complete(NextResponse.json({ success: true, locale: null }), {
      outcome: 'skipped', reason: 'LOCALE_UNAVAILABLE',
    })
  }

  const response = NextResponse.json({ success: true, locale: result.locale })
  response.cookies.set(COOKIE_NAME, result.locale, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(process.env.NODE_ENV === 'production' && { domain: 'moovx.ch' }),
  })
  return observe.complete(response, { outcome: 'success', reason: 'COMPLETED' })
}
