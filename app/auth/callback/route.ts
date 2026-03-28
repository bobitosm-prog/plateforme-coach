import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email')
          .eq('id', session.user.id)
          .single()

        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bobitosm@gmail.com'
        const coachEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
        const role = profile?.email === adminEmail ? 'super_admin'
          : (profile?.email === coachEmail || profile?.role === 'coach') ? 'coach'
          : 'client'

        const redirectTo = role === 'super_admin' ? '/admin' : role === 'coach' ? '/coach' : next
        const response = NextResponse.redirect(`${origin}${redirectTo}`)

        // Cookie bridge — first-party, survives Safari ITP
        response.cookies.set('moovx_auth_role', role, { path: '/', maxAge: 60, sameSite: 'lax', secure: true })
        response.cookies.set('moovx_auth_uid', session.user.id, { path: '/', maxAge: 60, sameSite: 'lax', secure: true })

        return response
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
