import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { assignConfiguredDefaultCoach } from '@/lib/coach-relations/default-assignment'

export async function POST(request: Request) {
  const body = await request.text()
  if (body.trim() && body.trim() !== '{}') {
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST' } }, { status: 400 })
  }

  const auth = await createSupabaseRouteClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ success: false, error: { code: 'SERVER_CONFIG_INVALID' } }, { status: 503 })

  try {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const assignment = await assignConfiguredDefaultCoach(admin, user.id, process.env.DEFAULT_COACH_EMAIL)
    return NextResponse.json({ success: true, data: assignment })
  } catch {
    return NextResponse.json({ success: false, error: { code: 'DEFAULT_COACH_UNAVAILABLE' } }, { status: 503 })
  }
}
