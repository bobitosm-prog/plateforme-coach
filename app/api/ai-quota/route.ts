import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { getAiQuota } from './service'

export async function GET(req: NextRequest) {
  const observe = createApiRouteObservability(req, {
    event: 'AI_QUOTA_REQUEST', domain: 'ai_quota', operation: 'GET /api/ai-quota',
  })
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const result = await getAiQuota({ ip })
  if (result.ok) return observe.complete(NextResponse.json(result.data), { outcome: 'success', reason: 'COMPLETED' })
  const status = result.code === 'RATE_LIMITED' ? 429 : result.code === 'AUTH_REQUIRED' ? 401 : 500
  return observe.complete(NextResponse.json({ ok: false }, { status }), {
    outcome: status >= 500 ? 'failed' : 'rejected', reason: result.code,
  })
}
