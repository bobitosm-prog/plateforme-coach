import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { level, message, details, page_url } = await req.json()
    if (!level || !message) return NextResponse.json({ error: 'level and message required' }, { status: 400 })

    // Try to get user from auth header
    let userId: string | null = null
    let userEmail: string | null = null
    const auth = req.headers.get('authorization')
    if (auth) {
      const { data } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    }

    await supabase.from('app_logs').insert({
      level, message,
      details: details ?? null,
      user_id: userId,
      user_email: userEmail,
      page_url: page_url ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[log-error]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
