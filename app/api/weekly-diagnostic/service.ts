import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { startAiUsage } from '@/lib/ai/usage'
import { checkRateLimit } from '@/lib/rate-limit'
import type { ApiErrorCode } from '@/lib/api/errors'

export type WeeklyDiagnosticServiceResult =
  | { ok: true; data: { diagnostic_id?: string; diagnostic?: unknown; already_exists?: true; message?: string } }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR'>; limit?: number; resetIn?: number; message?: string }

export async function createWeeklyDiagnostic(input: { ip: string; correlationId: string }): Promise<WeeklyDiagnosticServiceResult> {
  const supabase = await createSupabaseServerClient()
  const identity = await createIdentityRepository(supabase).getCurrent()
  if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
  if (!checkRateLimit(`diag:${input.ip}`, 3, 60_000).allowed) return { ok: false, code: 'RATE_LIMITED' }
  const usage = await startAiUsage({ client: supabase, feature: 'weekly-diagnostic', principal: { kind: 'user', id: identity.data.id }, correlationId: input.correlationId, logicalModel: 'claude-opus-4-8' })
  if (usage.status !== 'started') return { ok: false, code: 'INTERNAL_ERROR', message: 'Service temporairement indisponible' }
  const result = await generateWeeklyDiagnostic(identity.data.id, supabase)
  if (result.error) {
    await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'generation_failed' })
    return { ok: false, code: 'INTERNAL_ERROR', message: result.error }
  }
  if (result.already_exists) {
    await usage.tracker.finalize({ outcome: 'cancelled', reasonCode: 'already_exists' })
    return {
      ok: true,
      data: {
        already_exists: true,
        diagnostic_id: result.diagnostic_id,
        message: 'Diagnostic déjà généré pour cette semaine',
      },
    }
  }
  await usage.tracker.finalize({ outcome: 'succeeded', reasonCode: 'completed', providerModel: result.providerModel, tokens: result.tokens })
  return { ok: true, data: { diagnostic_id: result.diagnostic_id, diagnostic: result.diagnostic } }
}
