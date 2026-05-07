import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({
      error: 'No session',
      sessionError: sessionError?.message,
      cookies: cookieStore.getAll().map(c => c.name),
    })
  }

  // Query profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, subscription_status, coach_onboarding_complete, trial_ends_at')
    .eq('id', session.user.id)
    .single()

  // Query app_logs
  const { data: logs, error: logsError } = await supabase
    .from('app_logs')
    .select('message, details, page_url, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    session: { userId: session.user.id, email: session.user.email },
    profile,
    profileError: profileError?.message,
    recentLogs: logs,
    logsError: logsError?.message,
  })
}
