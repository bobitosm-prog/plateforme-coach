export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findActiveBetween } from '@/lib/coach-relations/repository'
import { endCoachClientRelation } from '@/lib/coach-relations/lifecycle-writer'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  clientId: z.string().uuid(),
}).strict()

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userLimit = checkRateLimit(`coach-end-relation:user:${user.id}`, 10, 60_000)
  const ipLimit = checkRateLimit(`coach-end-relation:ip:${ip}`, 30, 60_000)
  if (!userLimit.allowed || !ipLimit.allowed) {
    const retryAfter = Math.max(userLimit.retryAfter || 0, ipLimit.retryAfter || 0, 1)
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const body = await request.json().catch(() => null)
  const parsedRequest = requestSchema.safeParse(body)
  if (!parsedRequest.success) {
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
  if (profile.role !== 'coach') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const { clientId } = parsedRequest.data
  const activeRelation = await findActiveBetween(supabase, user.id, clientId)
  if (activeRelation.kind === 'not_found') {
    return NextResponse.json({ outcome: 'no_active_relation' }, { status: 404 })
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
    clientId,
    coachId: user.id,
    actorId: user.id,
    reason: 'coach_request',
  })

  if (transition.kind === 'ended') {
    return NextResponse.json({ outcome: 'ended', relationId: transition.relationId })
  }
  if (transition.kind === 'no_active_relation') {
    return NextResponse.json({ outcome: 'no_active_relation' }, { status: 404 })
  }
  if (transition.kind === 'conflict') {
    return NextResponse.json(transition, { status: 409 })
  }
  return NextResponse.json({ error: 'Transition impossible' }, { status: 500 })
}
