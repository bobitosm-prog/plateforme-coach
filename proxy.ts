import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED: Record<string, string[]> = {
  '/coach': ['coach', 'super_admin'],
  '/client': ['coach', 'super_admin'],
}

// ===== Locale detection (for unauthenticated visitors on /) =====
const SUPPORTED_LOCALES = ['fr', 'en', 'de'] as const
const DEFAULT_LOCALE = 'fr'

function detectLocale(request: NextRequest): string {
  // 1. Cookie NEXT_LOCALE (user's previous choice)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale
  }

  // 2. Accept-Language header (browser language)
  const acceptLang = request.headers.get('accept-language') || ''
  const primaryLang = acceptLang.split(',')[0]?.trim().toLowerCase() || ''
  if (primaryLang.startsWith('fr')) return 'fr'
  if (primaryLang.startsWith('de')) return 'de'
  if (primaryLang.startsWith('en')) return 'en'

  // 3. Geolocation via Vercel IP header
  const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase()
  if (['CH', 'FR', 'BE', 'LU', 'MC'].includes(country)) return 'fr'
  if (['DE', 'AT', 'LI'].includes(country)) return 'de'
  if (['US', 'GB', 'IE', 'CA', 'AU', 'NZ'].includes(country)) return 'en'

  // 4. Fallback
  return DEFAULT_LOCALE
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // ===== ROOT PATH: locale detection for non-auth visitors =====
  if (pathname === '/' && !session) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/landing`
    return NextResponse.redirect(url, 308)
  }

  // Chained onboarding redirect — applies to authenticated clients on /
  if (session && pathname === '/') {
    const { data: prof } = await supabase
      .from('profiles')
      .select('role, onboarding_completed_at, full_name, onboarding_photo_completed_at')
      .eq('id', session.user.id)
      .single()
    if (prof?.role === 'client') {
      if (!prof.onboarding_completed_at) {
        return NextResponse.redirect(new URL('/onboarding-fitness', request.url))
      }
      const fn = prof.full_name?.trim()
      if (!fn || fn === 'Athlete') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      if (!prof.onboarding_photo_completed_at) {
        return NextResponse.redirect(new URL('/onboarding-photo', request.url))
      }
    }
  }

  // Determine which protected prefix applies
  const matchedPrefix = Object.keys(PROTECTED).find(p => pathname.startsWith(p))
  if (!matchedPrefix) return response

  // Not authenticated → back to home
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Always fetch role fresh from DB
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  const role = (profile?.role ?? 'client') as string

  const allowed = PROTECTED[matchedPrefix]
  if (!allowed.includes(role)) {
    if (role === 'coach') return NextResponse.redirect(new URL('/coach', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/coach/:path*', '/client/:path*'],
}
