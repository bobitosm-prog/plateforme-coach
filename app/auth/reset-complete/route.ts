import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  const response = NextResponse.json({ success: Boolean(user) }, { status: user ? 200 : 401 })
  response.cookies.set('moovx_recovery_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/reset-password',
  })
  return response
}
