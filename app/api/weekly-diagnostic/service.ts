import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  generateWeeklyDiagnostic,
  writeWeeklyDiagnosticPerformanceEvent,
} from '@/lib/weekly-diagnostic/generator'
import { startAiUsage } from '@/lib/ai/usage'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ApiErrorCode } from '@/lib/api/errors'

export interface WeeklyDiagnosticPerformancePhases {
  readonly source_reads_ms: number
  readonly analysis_ms: number
  readonly ai_provider_ms: number
  readonly persistence_ms: number
}

export interface WeeklyDiagnosticPerformanceEvent extends WeeklyDiagnosticPerformancePhases {
  readonly request_id: string
  readonly result: 'success' | 'skipped' | 'rejected' | 'failed'
  readonly reason: string
  readonly server_total_ms: number
  readonly application_overhead_ms: number
}

export type WeeklyDiagnosticPerformanceObserver = (
  event: WeeklyDiagnosticPerformanceEvent,
) => void

const EMPTY_PHASES: WeeklyDiagnosticPerformancePhases = Object.freeze({
  source_reads_ms: 0,
  analysis_ms: 0,
  ai_provider_ms: 0,
  persistence_ms: 0,
})
const MAX_DURATION_MS = 86_400_000
const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const SAFE_REASON = /^[A-Z][A-Z0-9_]{2,63}$/

function boundedDuration(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_DURATION_MS, Math.max(0, Math.round(value)))
}

function emitPerformance(
  event: WeeklyDiagnosticPerformanceEvent,
  observer: WeeklyDiagnosticPerformanceObserver,
): void {
  try {
    observer(event)
  } catch {
    // Performance telemetry must never alter the diagnostic response.
  }
}

export type WeeklyDiagnosticServiceResult =
  | { ok: true; data: { diagnostic_id?: string; diagnostic?: unknown; already_exists?: true; message?: string } }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR'>; limit?: number; resetIn?: number; message?: string }

export async function createWeeklyDiagnostic(input: {
  ip: string
  correlationId: string
  signal?: AbortSignal
  performance?: {
    requestId: string
    now?: () => number
    observer?: WeeklyDiagnosticPerformanceObserver
  }
}): Promise<WeeklyDiagnosticServiceResult> {
  const now = input.performance?.now ?? (() => globalThis.performance.now())
  const startedAt = input.performance ? now() : 0
  let phases = EMPTY_PHASES
  let observed = false
  const complete = <T extends WeeklyDiagnosticServiceResult>(
    result: T,
    performanceResult: WeeklyDiagnosticPerformanceEvent['result'],
    reason: string,
  ): T => {
    if (!input.performance || observed) return result
    observed = true
    const serverTotalMs = boundedDuration(now() - startedAt)
    const normalizedPhases = {
      source_reads_ms: boundedDuration(phases.source_reads_ms),
      analysis_ms: boundedDuration(phases.analysis_ms),
      ai_provider_ms: boundedDuration(phases.ai_provider_ms),
      persistence_ms: boundedDuration(phases.persistence_ms),
    }
    const classifiedMs = Object.values(normalizedPhases).reduce((sum, value) => sum + value, 0)
    emitPerformance({
      request_id: SAFE_REQUEST_ID.test(input.performance.requestId)
        ? input.performance.requestId
        : 'invalid-request-id',
      result: performanceResult,
      reason: SAFE_REASON.test(reason) ? reason : 'UNKNOWN_REASON',
      server_total_ms: serverTotalMs,
      ...normalizedPhases,
      application_overhead_ms: boundedDuration(Math.min(serverTotalMs, Math.max(0, serverTotalMs - classifiedMs))),
    }, input.performance.observer ?? writeWeeklyDiagnosticPerformanceEvent)
    return result
  }

  const supabase = await createSupabaseServerClient()
  const identity = await createIdentityRepository(supabase).getCurrent()
  if (!identity.ok) return complete({ ok: false, code: 'AUTH_REQUIRED' }, 'rejected', 'AUTH_REQUIRED')
  if (!checkRateLimit(`diag:${input.ip}`, 3, 60_000).allowed) {
    return complete({ ok: false, code: 'RATE_LIMITED' }, 'rejected', 'RATE_LIMITED')
  }
  const usage = await startAiUsage({ client: supabase, feature: 'weekly-diagnostic', principal: { kind: 'user', id: identity.data.id }, correlationId: input.correlationId, logicalModel: 'anthropic-opus-4.8' })
  if (usage.status !== 'started') {
    return complete({ ok: false, code: 'INTERNAL_ERROR', message: 'Service temporairement indisponible' }, 'failed', 'USAGE_STORE_UNAVAILABLE')
  }
  const result = await generateWeeklyDiagnostic(identity.data.id, supabase, {
    correlationId: input.correlationId,
    signal: input.signal,
    ...(input.performance ? {
      performance: {
        now,
        record: (recordedPhases: WeeklyDiagnosticPerformancePhases) => { phases = recordedPhases },
      },
    } : {}),
  })
  if (result.error) {
    await usage.tracker.finalize({
      outcome: result.cancelled ? 'cancelled' : 'failed',
      reasonCode: result.reasonCode ?? 'generation_failed',
      providerModel: result.providerModel,
      tokens: result.tokens,
    })
    return complete(
      { ok: false, code: 'INTERNAL_ERROR', message: result.error },
      'failed',
      (result.reasonCode ?? 'GENERATION_FAILED').toUpperCase(),
    )
  }
  if (result.already_exists) {
    await usage.tracker.finalize({ outcome: 'cancelled', reasonCode: 'already_exists' })
    return complete({
      ok: true,
      data: {
        already_exists: true,
        diagnostic_id: result.diagnostic_id,
        message: 'Diagnostic déjà généré pour cette semaine',
      },
    }, 'skipped', 'RESOURCE_ALREADY_EXISTS')
  }
  await usage.tracker.finalize({ outcome: 'succeeded', reasonCode: 'completed', providerModel: result.providerModel, tokens: result.tokens })
  return complete(
    { ok: true, data: { diagnostic_id: result.diagnostic_id, diagnostic: result.diagnostic } },
    'success',
    'COMPLETED',
  )
}
