import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/campaigns
 *
 * Retourne toutes les campagnes beta, triées par date de création desc.
 * Bypass RLS via service_role.
 *
 * Auth : Bearer token de l'admin requis.
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    const { data, error } = await supabaseAdmin
      .from('beta_campaigns')
      .select('id, name, free_days, max_slots, used_slots, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/campaigns GET] Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns: data || [] })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}

/**
 * POST /api/admin/campaigns
 *
 * Crée une nouvelle campagne beta (inactive par défaut).
 * Body: { name: string, free_days: number, max_slots: number }
 *
 * Auth : Bearer token de l'admin requis.
 */
export async function POST(req: Request) {
  try {
    await verifyAdmin(req)

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const freeDays = Number(body.free_days)
    const maxSlots = Number(body.max_slots)

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: 'name must be a non-empty string (max 120 chars)' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(freeDays) || freeDays < 1 || freeDays > 365) {
      return NextResponse.json(
        { error: 'free_days must be an integer between 1 and 365' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 10000) {
      return NextResponse.json(
        { error: 'max_slots must be an integer between 1 and 10000' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('beta_campaigns')
      .insert({ name, free_days: freeDays, max_slots: maxSlots, used_slots: 0, is_active: false })
      .select()
      .single()

    if (error) {
      console.error('[admin/campaigns POST] Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign: data })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
