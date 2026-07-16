import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createIdentityRepository } from '@/lib/repositories/identity'
import { createProfileRepository } from '@/lib/repositories/profile'

const SUPPORTED_LOCALES = ['fr', 'en', 'de'] as const
const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function POST(req: NextRequest) {
  try {
    const { locale } = await req.json()

    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const update = await createProfileRepository(supabase).updateSafe(identity.data.id, { preferred_locale: locale })

    if (!update.ok && update.kind === 'failure') {
      console.error('[locale] DB update failed')
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
