/**
 * Load the exercise catalog from exercises_db.
 * Best-effort: returns [] on error, never throws.
 */
import type { DatabaseClient } from '../supabase/types'
import { writeApiRouteEvent } from '../api/route-observability'

const CATALOG_LOG = { event: 'AI_TRAINING_CATALOG', domain: 'ai', operation: 'POST /api/generate-custom-program' } as const

export async function loadExerciseCatalog(
  supabase: DatabaseClient,
  correlationId: string,
): Promise<{ id: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('exercises_db')
      .select('id, name')
    if (error) {
      writeApiRouteEvent(CATALOG_LOG, { outcome: 'failed', reason: 'CATALOG_READ_FAILED' }, { requestId: correlationId, status: 500 })
      return []
    }
    return (data || []).filter((row): row is { id: string; name: string } => Boolean(row.id && row.name))
  } catch {
    writeApiRouteEvent(CATALOG_LOG, { outcome: 'failed', reason: 'CATALOG_READ_UNEXPECTED' }, { requestId: correlationId, status: 500 })
    return []
  }
}
