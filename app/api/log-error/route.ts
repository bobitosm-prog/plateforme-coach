import { NextRequest, NextResponse } from 'next/server'
import { validateJsonBody } from '@/lib/api/validation'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { clientLogSchema } from './schema'
import { acceptClientLogRequest, persistClientLog } from './service'

async function legacyValidationStatus(response: Response): Promise<number> {
  const body = await response.json()
  const code = body?.error?.details?.issues?.[0]?.code
  return code === 'malformed_json' || code === 'body_required' ? 500 : 400
}

export async function POST(req: NextRequest) {
  const observe = createApiRouteObservability(req, {
    event: 'CLIENT_LOG_REQUEST', domain: 'client_log', operation: 'POST /api/log-error',
  })
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!acceptClientLogRequest(ip)) {
    return observe.complete(NextResponse.json({ ok: false }, { status: 429 }), {
      outcome: 'rejected', reason: 'RATE_LIMITED',
    })
  }
  const validation = await validateJsonBody(req, clientLogSchema, { requireJsonContentType: false })
  if (!validation.ok) {
    const status = await legacyValidationStatus(validation.response)
    return observe.complete(NextResponse.json({ ok: false }, { status }), {
      outcome: status >= 500 ? 'failed' : 'rejected',
      reason: status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
    })
  }
  const result = await persistClientLog(validation.data)
  if (result.ok) {
    return observe.complete(NextResponse.json({ ok: true }), { outcome: 'success', reason: 'COMPLETED' })
  }
  return observe.complete(NextResponse.json({ ok: false }, { status: 500 }), {
    outcome: 'failed', reason: result.code,
  })
}
