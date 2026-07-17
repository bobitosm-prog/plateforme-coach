import { createIdentityRepository } from '@/lib/repositories/identity'
import { createProfileRepository } from '@/lib/repositories/profile'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ApiErrorCode } from '@/lib/api/errors'

export type SupportedLocale = 'fr' | 'en' | 'de'
export type SyncLocaleServiceResult =
  | { ok: true; locale: SupportedLocale | null }
  | { ok: false; code: Extract<ApiErrorCode, 'AUTH_REQUIRED' | 'INTERNAL_ERROR'> }

export async function readSessionLocale(): Promise<SyncLocaleServiceResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return { ok: false, code: 'AUTH_REQUIRED' }
    const profile = await createProfileRepository(supabase).findById(identity.data.id)
    const locale = profile.ok ? profile.data.preferred_locale : null
    return { ok: true, locale: locale === 'fr' || locale === 'en' || locale === 'de' ? locale : null }
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' }
  }
}
