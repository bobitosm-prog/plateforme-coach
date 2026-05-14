import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/logger'

export const dynamic = 'force-dynamic'

const PatchRoleSchema = z.object({
  role: z.enum(['client', 'coach', 'admin']),
})

/**
 * PATCH /api/admin/users/[id]/role
 * Body: { role: 'client' | 'coach' | 'admin' }
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
    const parsed = PatchRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Lire l'état actuel pour le log
    const { data: current, error: readError } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', targetId)
      .single()

    if (readError || !current) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const oldRole = current.role
    const newRole = parsed.data.role

    if (oldRole === newRole) {
      return NextResponse.json({
        success: true,
        noChange: true,
        user: current,
      })
    }

    // Update
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetId)
      .select('id, email, role')
      .single()

    if (updateError) {
      console.error('[admin/users/role PATCH] Update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Log async, ne bloque pas la réponse
    logAdminAction({
      action: 'role_change',
      target_user_id: targetId,
      target_email: current.email,
      actor_email: admin.email,
      metadata: { old_role: oldRole, new_role: newRole },
    }).catch(() => {})

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
