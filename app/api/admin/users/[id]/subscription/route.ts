import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'

export const dynamic = 'force-dynamic'

const PatchSubscriptionSchema = z.object({
  subscription_type: z.enum([
    'client_monthly',
    'lifetime',
    'invited',
    'trial',
  ]).nullable(),
  subscription_status: z.enum([
    'active',
    'canceled',
    'past_due',
    'trialing',
    'inactive',
  ]).nullable(),
  subscription_end_date: z.string().datetime().nullable().optional(),
})

/**
 * PATCH /api/admin/users/[id]/subscription
 * Body: { subscription_type, subscription_status, subscription_end_date? }
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req)
    const { id: targetId } = await context.params

    if (!targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
      return NextResponse.json(
        { error: 'Invalid user id' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = PatchSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from('profiles')
      .select('email, subscription_type, subscription_status, subscription_end_date')
      .eq('id', targetId)
      .single()

    if (readError || !current) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const patch: Record<string, unknown> = {
      subscription_type: parsed.data.subscription_type,
      subscription_status: parsed.data.subscription_status,
      updated_at: new Date().toISOString(),
    }
    if (parsed.data.subscription_end_date !== undefined) {
      patch.subscription_end_date = parsed.data.subscription_end_date
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select(`
        id, email, subscription_type, subscription_status,
        subscription_end_date, subscription_price
      `)
      .single()

    if (updateError) {
      console.error('[admin/users/subscription PATCH] Update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    logAdminAction({
      action: 'subscription_change',
      target_user_id: targetId,
      target_email: current.email,
      actor_email: admin.email,
      metadata: {
        old: {
          type: current.subscription_type,
          status: current.subscription_status,
          end_date: current.subscription_end_date,
        },
        new: parsed.data,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
