import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')      // 'signup' = force re-login post-confirmation
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fix role from user_metadata if profile.role is null
      const metaRole = data.session?.user?.user_metadata?.role
      if (metaRole && data.session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle()
        if (prof && !prof.role) {
          await supabase.from('profiles').update({ role: metaRole }).eq('id', data.session.user.id)
        }
      }

      // Coach invitation link (?coach=uuid) — server API to bypass RLS
      const coachId = searchParams.get('coach')
      if (coachId && data.session) {
        await fetch(`${origin}/api/assign-coach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coachId, clientId: data.session.user.id }),
        })
      }

      // Self-signup flow → force re-login + banner sur /login
      // Exchange déjà fait (email_confirmed_at set en DB + sync rôle appliqué),
      // on jette ensuite la session browser pour reproduire un login manuel.
      if (type === 'signup') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?confirmed=1`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login`)
}
