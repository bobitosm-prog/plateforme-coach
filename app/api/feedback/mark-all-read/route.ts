import { NextResponse } from 'next/server'
import { createApiRouteObservability } from '@/lib/api/route-observability'
import { markMyFeedbackRead } from './service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/feedback/mark-all-read
 * Marque toutes les reponses admin du user connecte comme lues.
 */
export async function POST(request: Request) {
  const observe = createApiRouteObservability(request, {
    event: 'FEEDBACK_MARK_READ_REQUEST', domain: 'feedback', operation: 'POST /api/feedback/mark-all-read',
  })
  const result = await markMyFeedbackRead()
  if (result.ok) {
    return observe.complete(NextResponse.json({ success: true, markedCount: result.markedCount }), {
      outcome: 'success', reason: 'COMPLETED', context: { marked_count: result.markedCount },
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
