import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createIdentityRepository } from '@/lib/repositories/identity'
import { createProfileRepository } from '@/lib/repositories/profile'

const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await createProfileRepository(supabase).findById(identity.data.id)
    const locale = profile.ok ? profile.data.preferred_locale : null
    if (!locale || !['fr', 'en', 'de'].includes(locale)) {
      return NextResponse.json({ success: true, locale: null })
    }

    const response = NextResponse.json({ success: true, locale })
    response.cookies.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && { domain: 'moovx.ch' }),
    })
    return response
  } catch (e: unknown) {
    console.error('[sync-locale] Error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
