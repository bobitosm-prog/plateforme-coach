export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { findActiveCoachForClient } from '@/lib/coach-relations/repository'
import { endCoachClientRelation } from '@/lib/coach-relations/lifecycle-writer'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userLimit = checkRateLimit(`coach-disconnect:user:${user.id}`, 5, 60_000)
  const ipLimit = checkRateLimit(`coach-disconnect:ip:${ip}`, 15, 60_000)
  if (!userLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(userLimit.retryAfter || 0, ipLimit.retryAfter || 0, 1)
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
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

  const activeRelation = await findActiveCoachForClient(supabase, user.id)
  if (activeRelation.kind === 'not_found') {
    return NextResponse.json({ outcome: 'no_active_relation' })
  }
  if (activeRelation.kind === 'multiple_active') {
    return NextResponse.json(
      { outcome: 'conflict', code: 'RELATION_MULTIPLE_ACTIVE' },
      { status: 409 },
    )
  }
  if (activeRelation.kind === 'error') {
    return NextResponse.json({ error: 'Relation indisponible' }, { status: 500 })
  }

  const transition = await endCoachClientRelation({
    clientId: user.id,
    coachId: activeRelation.relation.coach_id,
    actorId: user.id,
    reason: 'client_request',
  })

  if (transition.kind === 'ended') {
    return NextResponse.json({ outcome: 'ended', relationId: transition.relationId })
  }
  if (transition.kind === 'no_active_relation') {
    return NextResponse.json({ outcome: 'no_active_relation' })
  }
  if (transition.kind === 'conflict') {
    return NextResponse.json(transition, { status: 409 })
  }
  return NextResponse.json({ error: 'Transition impossible' }, { status: 500 })
}
