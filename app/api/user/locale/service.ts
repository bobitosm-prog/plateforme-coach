import { createIdentityRepository } from '@/lib/repositories/identity'
import { createProfileRepository } from '@/lib/repositories/profile'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UpdateLocaleInput } from './schema'
import type { ApiErrorCode } from '@/lib/api/errors'

export type UpdateLocaleServiceResult =
  | { ok: true; locale: UpdateLocaleInput['locale'] }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'PERSISTENCE_FAILED' | 'INTERNAL_ERROR'> }

export async function updateSessionLocale(input: UpdateLocaleInput): Promise<UpdateLocaleServiceResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
    const update = await createProfileRepository(supabase).updateSafe(identity.data.id, {
      preferred_locale: input.locale,
    })
    if (!update.ok && update.kind === 'failure') return { ok: false, code: 'PERSISTENCE_FAILED' }
    return { ok: true, locale: input.locale }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
