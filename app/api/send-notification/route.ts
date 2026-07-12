export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendPushToUser } from '../../../lib/push-server'
import { authorizeUserPush, userPushRequestSchema } from '../../../lib/notifications/authorize-user-push'

export async function POST(req: NextRequest) {
  // Auth check (session-based — for user-initiated pushes)
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = userPushRequestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 })
  }

  const { userId, title, body, url, tag } = parsed.data
  const authorization = await authorizeUserPush(supabaseAdmin, user.id, userId)
  if (!authorization.allowed) {
    return NextResponse.json({ error: authorization.reason }, { status: authorization.status })
  }

  const result = await sendPushToUser(supabaseAdmin, userId, { title, body, url, tag })
  return NextResponse.json(result)
}
