import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  if ((await request.text()).trim()) return NextResponse.json({ success: false }, { status: 400 })
  const auth = await createSupabaseRouteClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ success: false }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ success: false }, { status: 503 })
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('coach_clients').delete().eq('client_id', user.id)
  return NextResponse.json({ success: !error }, { status: error ? 500 : 200 })
}
