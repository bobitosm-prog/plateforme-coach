import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_locale')
      .eq('id', user.id)
      .maybeSingle()

    const locale = profile?.preferred_locale
    if (!locale || !['fr', 'en', 'de'].includes(locale)) {
      return NextResponse.json({ success: true, locale: null })
    }

    const response = NextResponse.json({ success: true, locale })
    response.cookies.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  } catch (e: unknown) {
    console.error('[sync-locale] Error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
