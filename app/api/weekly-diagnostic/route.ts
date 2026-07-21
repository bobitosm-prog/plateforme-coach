import { NextRequest, NextResponse } from 'next/server'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { aiUsageCorrelationId } from '@/lib/ai/usage'
import { aiRateLimitResponse } from '../../../lib/rate-limit'
import { createWeeklyDiagnostic } from './service'

export async function POST(req: NextRequest) {
  const observe = createApiRouteObservability(req, {
    event: 'WEEKLY_DIAGNOSTIC_REQUEST', domain: 'weekly_diagnostic', operation: 'POST /api/weekly-diagnostic',
  })
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const result = await createWeeklyDiagnostic({ ip, correlationId: aiUsageCorrelationId(req) })
  if (result.ok) {
    return observe.complete(NextResponse.json(result.data), {
      outcome: result.data.already_exists ? 'skipped' : 'success',
      reason: result.data.already_exists ? 'RESOURCE_ALREADY_EXISTS' : 'COMPLETED',
    })
  }
  if (result.code === 'AUTH_REQUIRED') {
    return observe.complete(NextResponse.json({ error: 'Non autorisé' }, { status: 401 }), {
      outcome: 'rejected', reason: result.code,
    })
  }
  if (result.code === 'RATE_LIMITED') {
    return observe.complete(NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 }), {
      outcome: 'rejected', reason: result.code,
    })
  }
  if (result.code === 'QUOTA_EXCEEDED') {
    return observe.complete(aiRateLimitResponse(result.limit ?? 0, result.resetIn ?? 0), {
      outcome: 'rejected', reason: result.code,
    })
  }
  return observe.complete(NextResponse.json({ error: result.message }, { status: 500 }), {
    outcome: 'failed', reason: result.code,
  })
}
