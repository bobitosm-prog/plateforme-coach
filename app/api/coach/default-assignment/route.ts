export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  assignConfiguredDefaultCoach,
  resolveDefaultCoachEmail,
} from '@/lib/coach-relations/default-assignment'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userLimit = checkRateLimit(`default-coach:user:${user.id}`, 10, 60_000)
  const ipLimit = checkRateLimit(`default-coach:ip:${ip}`, 30, 60_000)
  if (!userLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(userLimit.retryAfter || 0, ipLimit.retryAfter || 0, 1)
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const body = await request.text()
  if (body.trim() && body.trim() !== '{}') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Autorisation impossible' }, { status: 500 })
  }
  if (profile.role !== 'client') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const configuredEmail = resolveDefaultCoachEmail(
    process.env.DEFAULT_COACH_EMAIL,
    process.env.NEXT_PUBLIC_COACH_EMAIL,
  )
  const assignment = await assignConfiguredDefaultCoach({
    clientId: user.id,
    actorId: user.id,
    configuredEmail,
  })

  if (assignment.kind === 'created') {
    return NextResponse.json({ outcome: 'created', relationId: assignment.relationId }, { status: 201 })
  }
  if (assignment.kind === 'already_active_same_coach') {
    return NextResponse.json({ outcome: 'already_active_same_coach', relationId: assignment.relationId })
  }
  if (assignment.kind === 'conflict') {
    return NextResponse.json(
      { outcome: 'active_relation_preserved', code: assignment.code },
      { status: 409 },
    )
  }
  return NextResponse.json(
    { error: 'Coach par défaut indisponible', code: assignment.code },
    { status: 503 },
  )
}
