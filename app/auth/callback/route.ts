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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If user_metadata contains a role but profile doesn't, fix it
      const metaRole = data.session?.user?.user_metadata?.role
      if (metaRole && data.session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle()
        if (prof && !prof.role) {
          await supabase.from('profiles').update({ role: metaRole }).eq('id', data.session.user.id)
        }
      }
      // Handle coach invitation link (?coach=uuid) — use server API to bypass RLS
      const coachId = searchParams.get('coach')
      if (coachId && data.session) {
        await fetch(`${origin}/api/assign-coach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coachId, clientId: data.session.user.id }),
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
