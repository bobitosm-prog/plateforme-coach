import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED: Record<string, string[]> = {
  '/admin': ['super_admin'],
  '/coach': ['coach', 'super_admin'],
  '/client': ['coach', 'super_admin'],
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

  // Determine which protected prefix applies
  const matchedPrefix = Object.keys(PROTECTED).find(p => pathname.startsWith(p))
  if (!matchedPrefix) return response

  // Not authenticated → back to home
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Always fetch role fresh from DB — no cookie cache (stale cookies caused redirect loops)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  const role = (profile?.role ?? 'client') as string

  const allowed = PROTECTED[matchedPrefix]
  if (!allowed.includes(role)) {
    // Redirect to appropriate home based on actual role
    if (role === 'coach') return NextResponse.redirect(new URL('/coach', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/coach/:path*', '/client/:path*'],
}
