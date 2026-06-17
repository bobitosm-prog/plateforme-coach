import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/campaigns/[id]
 *
 * Édite une campagne beta et/ou toggle is_active.
 * Body (tous optionnels): { name?, free_days?, max_slots?, is_active? }
 *
 * Règles :
 * - used_slots est JAMAIS écrit (lecture seule, incrémenté par claim_beta_slot).
 * - max_slots ne peut pas descendre en dessous de used_slots actuel.
 * - Une seule campagne peut être active (index unique partiel). Si is_active=true,
 *   on désactive toutes les autres d'abord.
 *
 * Auth : Bearer token de l'admin requis.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(req)
    const { id } = await context.params

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { error: 'Invalid campaign id' },
        { status: 400 }
      )
    }

    const body = await req.json()

    // Strip used_slots — never writable via admin API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { used_slots: _ignored, ...rest } = body

    const update: Record<string, unknown> = {}

    if ('name' in rest) {
      const name = typeof rest.name === 'string' ? rest.name.trim() : ''
      if (!name || name.length > 120) {
        return NextResponse.json(
          { error: 'name must be a non-empty string (max 120 chars)' },
          { status: 400 }
        )
      }
      update.name = name
    }

    if ('free_days' in rest) {
      const freeDays = Number(rest.free_days)
      if (!Number.isInteger(freeDays) || freeDays < 1 || freeDays > 365) {
        return NextResponse.json(
          { error: 'free_days must be an integer between 1 and 365' },
          { status: 400 }
        )
      }
      update.free_days = freeDays
    }

    if ('max_slots' in rest) {
      const maxSlots = Number(rest.max_slots)
      if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 10000) {
        return NextResponse.json(
          { error: 'max_slots must be an integer between 1 and 10000' },
          { status: 400 }
        )
      }

      // Vérifier que max_slots >= used_slots actuel
      const { data: current, error: readErr } = await supabaseAdmin
        .from('beta_campaigns')
        .select('used_slots')
        .eq('id', id)
        .single()

      if (readErr || !current) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      if (maxSlots < current.used_slots) {
        return NextResponse.json(
          { error: `max_slots (${maxSlots}) cannot be less than used_slots (${current.used_slots})` },
          { status: 400 }
        )
      }

      update.max_slots = maxSlots
    }

    // Règle "une seule active" : désactiver les autres AVANT d'activer celle-ci
    if (rest.is_active === true) {
      const { error: deactivateErr } = await supabaseAdmin
        .from('beta_campaigns')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id)

      if (deactivateErr) {
        console.error('[admin/campaigns PATCH] deactivate others error:', deactivateErr)
        return NextResponse.json(
          { error: deactivateErr.message },
          { status: 500 }
        )
      }

      update.is_active = true
    } else if ('is_active' in rest && rest.is_active === false) {
      update.is_active = false
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('beta_campaigns')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/campaigns PATCH] Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign: data })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
