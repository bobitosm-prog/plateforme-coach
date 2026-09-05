import { NextResponse } from 'next/server'

import { handleAdminAuthError, verifyAdmin } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'
import { grantAdminLegacyInvitedAccess } from '@/lib/entitlements/admin-legacy-entitlement-writer'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdmin(req)
    const rateLimit = checkRateLimit(
      `admin-legacy-entitlement:${admin.userId}`,
      10,
      60_000,
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many entitlement changes' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) },
        },
      )
    }

    const { id: targetId } = await context.params
    if (!UUID_PATTERN.test(targetId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', targetId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await grantAdminLegacyInvitedAccess({
      userId: targetId,
      actorId: admin.userId,
    })

    logAdminAction({
      action: 'legacy_entitlement_grant',
      target_user_id: targetId,
      target_email: profile.email,
      actor_email: admin.email,
      metadata: {
        entitlement: 'legacy_invited_access',
        source: 'admin',
        outcome: result.kind,
      },
    }).catch(() => {})

    return NextResponse.json(
      { outcome: result.kind },
      { status: result.kind === 'created' ? 201 : 200 },
    )
  } catch (error) {
    return handleAdminAuthError(error)
  }
}
