import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['fr', 'en', 'de'] as const
const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function POST(req: NextRequest) {
  try {
    const { locale } = await req.json()

    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferred_locale: locale })
      .eq('id', user.id)

    if (updateError) {
      console.error('[locale] DB update failed:', updateError.message)
      return NextResponse.json({ error: 'Failed to update locale' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true, locale })
    response.cookies.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.NODE_ENV === 'production' && { domain: '.moovx.ch' }),
    })
    return response
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[locale] Error:', message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
