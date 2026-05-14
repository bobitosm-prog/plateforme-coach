import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users
 *
 * Retourne TOUS les profils de la plateforme.
 * Bypass RLS via service_role.
 *
 * Auth : Bearer token de l'admin requis.
 *
 * Query params :
 *   - search : filtre fuzzy sur email/full_name (optionnel)
 *   - role : filtre exact sur role (optionnel)
 *   - limit : défaut 200, max 1000
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    const url = new URL(req.url)
    const search = url.searchParams.get('search')?.trim() || ''
    const roleFilter = url.searchParams.get('role')?.trim() || ''
    const limitParam = parseInt(url.searchParams.get('limit') || '200', 10)
    const limit = Math.min(Math.max(limitParam, 1), 1000)

    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id, email, full_name, phone, avatar_url, role, status,
        subscription_type, subscription_status, subscription_price,
        subscription_end_date, trial_ends_at,
        stripe_customer_id, stripe_subscription_id, stripe_account_id,
        created_at, updated_at, last_workout_at, onboarding_completed,
        streak_current, fitness_score
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    if (search) {
      // ilike sur email OR full_name
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/users GET] Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: data || [],
      count: data?.length || 0,
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
