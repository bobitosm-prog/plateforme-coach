import { NextRequest, NextResponse } from 'next/server'
import { loadEffectiveEntitlementContext } from '@/lib/entitlements/server-context'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipLimit = checkRateLimit(`entitlement-snapshot:ip:${ip}`, 60, 60_000)
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfter || 1) } },
    )
  }

  try {
    const supabase = await createSupabaseRouteClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userLimit = checkRateLimit(`entitlement-snapshot:user:${user.id}`, 30, 60_000)
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: { 'Retry-After': String(userLimit.retryAfter || 1) } },
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Autorisation impossible' }, { status: 403 })
    }

    const { capabilities, effectiveEntitlement } = await loadEffectiveEntitlementContext(
      user.id,
      profile.subscription_type,
    )
    return NextResponse.json(
      { capabilities, effectiveEntitlement },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Autorisation impossible' }, { status: 503 })
  }
}
