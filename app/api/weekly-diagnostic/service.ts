import { createIdentityRepository } from '@/lib/repositories/identity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateWeeklyDiagnostic } from '@/lib/weekly-diagnostic/generator'
import { checkAiRateLimit, checkRateLimit, logAiUsage } from '@/lib/rate-limit'
import type { ApiErrorCode } from '@/lib/api/errors'

export type WeeklyDiagnosticServiceResult =
  | { ok: true; data: { diagnostic_id?: string; diagnostic?: unknown; already_exists?: true; message?: string } }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR'>; limit?: number; resetIn?: number; message?: string }

export async function createWeeklyDiagnostic(input: { ip: string }): Promise<WeeklyDiagnosticServiceResult> {
  const supabase = await createSupabaseServerClient()
  const identity = await createIdentityRepository(supabase).getCurrent()
  if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
  if (!checkRateLimit(`diag:${input.ip}`, 3, 60_000).allowed) return { ok: false, code: 'RATE_LIMITED' }
  const aiLimit = await checkAiRateLimit(supabase, identity.data.id, 'weekly-diagnostic')
  if (!aiLimit.allowed) {
    return { ok: false, code: 'QUOTA_EXCEEDED', limit: aiLimit.limit, resetIn: aiLimit.resetIn }
  }
  await logAiUsage(supabase, identity.data.id, 'weekly-diagnostic')
  const result = await generateWeeklyDiagnostic(identity.data.id, supabase)
  if (result.error) return { ok: false, code: 'INTERNAL_ERROR', message: result.error }
  if (result.already_exists) {
    return {
      ok: true,
      data: {
        already_exists: true,
        diagnostic_id: result.diagnostic_id,
        message: 'Diagnostic déjà généré pour cette semaine',
      },
    }
  }
  return { ok: true, data: { diagnostic_id: result.diagnostic_id, diagnostic: result.diagnostic } }
}
