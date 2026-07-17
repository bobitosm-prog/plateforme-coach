import { NextResponse } from 'next/server'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { readMyFeedback } from './service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/feedback/mine
 * Retourne les bug_reports du user connecte (via RLS Supabase).
 */
export async function GET(request: Request) {
  const observe = createApiRouteObservability(request, {
    event: 'FEEDBACK_READ_REQUEST', domain: 'feedback', operation: 'GET /api/feedback/mine',
  })
  const result = await readMyFeedback()
  if (result.ok) {
    return observe.complete(NextResponse.json({ reports: result.reports, count: result.count, unreadCount: result.unreadCount }), {
      outcome: 'success', reason: 'COMPLETED', context: { result_count: result.count, unread_count: result.unreadCount },
    })
  }
  if (result.code === 'AUTH_REQUIRED') {
    return observe.complete(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), {
      outcome: 'rejected', reason: result.code,
    })
  }
  if (result.code === 'PERSISTENCE_FAILED') {
    return observe.complete(NextResponse.json({ error: result.internalMessage }, { status: 500 }), {
      outcome: 'failed', reason: result.code,
    })
  }
  return observe.complete(NextResponse.json({ error: 'Internal error' }, { status: 500 }), {
    outcome: 'failed', reason: result.code,
  })
}
