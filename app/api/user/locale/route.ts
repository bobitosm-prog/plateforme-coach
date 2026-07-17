import { NextRequest, NextResponse } from 'next/server'
import { validateJsonBody } from '@/lib/api/validation'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { updateLocaleSchema } from './schema'
import { updateSessionLocale } from './service'

const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

async function legacyValidationFailure(response: Response): Promise<Response> {
  const body = await response.json()
  const code = body?.error?.details?.issues?.[0]?.code
  if (code === 'malformed_json' || code === 'body_required') {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const observe = createApiRouteObservability(req, {
    event: 'LOCALE_UPDATE_REQUEST', domain: 'locale', operation: 'POST /api/user/locale',
  })
  const validation = await validateJsonBody(req, updateLocaleSchema, { requireJsonContentType: false })
  if (!validation.ok) {
    const response = await legacyValidationFailure(validation.response)
    return observe.complete(response, {
      outcome: response.status >= 500 ? 'failed' : 'rejected',
      reason: response.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
    })
  }
  const result = await updateSessionLocale(validation.data)
  if (!result.ok) {
    if (result.code === 'AUTH_REQUIRED') {
      return observe.complete(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), {
        outcome: 'rejected', reason: result.code,
      })
    }
    if (result.code === 'PERSISTENCE_FAILED') {
      return observe.complete(NextResponse.json({ error: 'Failed to update locale' }, { status: 500 }), {
        outcome: 'failed', reason: result.code,
      })
    }
    return observe.complete(NextResponse.json({ error: 'Server error' }, { status: 500 }), {
      outcome: 'failed', reason: result.code,
    })
  }

  const response = NextResponse.json({ success: true, locale: result.locale })
  response.cookies.set(COOKIE_NAME, result.locale, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(process.env.NODE_ENV === 'production' && { domain: '.moovx.ch' }),
  })
  return observe.complete(response, { outcome: 'success', reason: 'COMPLETED' })
}
