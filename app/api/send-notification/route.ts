export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '../../../lib/rate-limit'
import { sendPushToUser } from '../../../lib/push-server'
import { findActiveBetween } from '../../../lib/coach-relations/repository'

const internalPathSchema = z.string().trim().max(2048).refine(
  value => /^\/(?!\/)[^\\\u0000-\u001F\u007F]*$/.test(value),
  { message: 'URL must be an internal path' },
)

const notificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(500),
  url: internalPathSchema.optional(),
  tag: z.string().trim().min(1).max(100).optional(),
}).strict()

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

  const requestBody = await req.json().catch(() => null)
  const parsedRequest = notificationSchema.safeParse(requestBody)
  if (!parsedRequest.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userLimit = checkRateLimit(`notification:user:${user.id}`, 10, 60_000)
  const ipLimit = checkRateLimit(`notification:ip:${ip}`, 30, 60_000)
  if (!userLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(userLimit.retryAfter || 0, ipLimit.retryAfter || 0, 1)
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const { userId, title, body, url, tag } = parsedRequest.data
  const { data: senderProfile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !senderProfile) {
    return NextResponse.json({ error: 'Autorisation impossible' }, { status: 500 })
  }

  let coachId: string
  let clientId: string
  if (senderProfile.role === 'coach' || senderProfile.role === 'super_admin') {
    coachId = user.id
    clientId = userId
  } else if (senderProfile.role === 'client') {
    coachId = userId
    clientId = user.id
  } else {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const relation = await findActiveBetween(supabaseAuth, coachId, clientId)
  if (relation.kind === 'not_found') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  if (relation.kind !== 'active') {
    return NextResponse.json({ error: 'Autorisation impossible' }, { status: 500 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const result = await sendPushToUser(supabaseAdmin, userId, { title, body, url, tag })
  return NextResponse.json(result)
}
