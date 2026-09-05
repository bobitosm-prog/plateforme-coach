import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_ERROR_CODES = {
  callback: 'callback_invalid',
  oauth: 'oauth_error',
  recovery: 'recovery_error',
  confirmation: 'confirmation_error',
} as const

function loginErrorRedirect(origin: string, code: keyof typeof AUTH_ERROR_CODES) {
  const response = NextResponse.redirect(`${origin}/login?auth_error=${AUTH_ERROR_CODES[code]}`)
  response.cookies.set('moovx_oauth_role_intent', '', { maxAge: 0, path: '/auth/callback' })
  return response
}

function clearOauthRoleIntent(response: NextResponse) {
  response.cookies.set('moovx_oauth_role_intent', '', { maxAge: 0, path: '/auth/callback' })
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')      // 'signup' = force re-login post-confirmation
  const requestedNext = searchParams.get('next') || '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/'

  const errorParam = searchParams.get('error')
  if (errorParam) {
    if (type === 'recovery') return loginErrorRedirect(origin, 'recovery')
    if (type === 'signup') return loginErrorRedirect(origin, 'confirmation')
    return loginErrorRedirect(origin, 'oauth')
  }

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fix role from user_metadata if profile.role is null — via set_role RPC (bypass trigger guard_profile_sensitive_columns)
      const oauthRoleIntent = cookieStore.get('moovx_oauth_role_intent')?.value
      const metadataRole = data.session?.user?.user_metadata?.role
      const metaRole = oauthRoleIntent === 'client' || oauthRoleIntent === 'coach'
        ? oauthRoleIntent
        : metadataRole === 'client' || metadataRole === 'coach'
          ? metadataRole
          : null
      if (metaRole && data.session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle()
        if (prof && !prof.role) {
          await supabase.rpc('set_role', { p_role: metaRole })
        }
      }

      if (type === 'recovery') {
        const response = NextResponse.redirect(`${origin}/reset-password`)
        response.cookies.set('moovx_recovery_session', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 10 * 60,
          path: '/reset-password',
        })
        clearOauthRoleIntent(response)
        return response
      }

      // Self-signup flow → force re-login + banner sur /login
      // Exchange déjà fait (email_confirmed_at set en DB + sync rôle appliqué),
      // on jette ensuite la session browser pour reproduire un login manuel.
      if (type === 'signup') {
        await supabase.auth.signOut()
        const suffix = next === '/join' ? '&next=%2Fjoin' : ''
        const response = NextResponse.redirect(`${origin}/login?confirmed=1${suffix}`)
        clearOauthRoleIntent(response)
        return response
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      clearOauthRoleIntent(response)
      return response
    }
    if (type === 'recovery') return loginErrorRedirect(origin, 'recovery')
    if (type === 'signup') return loginErrorRedirect(origin, 'confirmation')
    return loginErrorRedirect(origin, 'callback')
  }
  return loginErrorRedirect(origin, type === 'recovery' ? 'recovery' : type === 'signup' ? 'confirmation' : 'callback')
}
