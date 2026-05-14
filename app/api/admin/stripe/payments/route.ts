import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stripe/payments
 *
 * Liste des paiements récents avec enrichissement client/coach.
 *
 * Query params :
 *  - limit : défaut 50, max 500
 *  - status : filtre exact (ex: 'succeeded', 'failed')
 *  - since : ISO date — paiements après cette date
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    const url = new URL(req.url)
    const limitParam = parseInt(url.searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(limitParam, 1), 500)
    const statusFilter = url.searchParams.get('status')?.trim() || ''
    const sinceParam = url.searchParams.get('since')?.trim() || ''

    let query = supabaseAdmin
      .from('payments')
      .select(`
        id, amount, currency, status, description,
        stripe_checkout_session_id, paid_at, created_at,
        client_id, coach_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusFilter) query = query.eq('status', statusFilter)
    if (sinceParam) query = query.gte('created_at', sinceParam)

    const { data: payments, error } = await query

    if (error) {
      console.error('[admin/stripe/payments GET] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({ payments: [], count: 0 })
    }

    // Enrichir avec emails/noms des clients et coachs
    const userIds = Array.from(new Set([
      ...payments.map(p => p.client_id).filter(Boolean),
      ...payments.map(p => p.coach_id).filter(Boolean),
    ])) as string[]

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    )

    const enriched = payments.map(p => ({
      ...p,
      client: p.client_id ? profileMap.get(p.client_id) || null : null,
      coach: p.coach_id ? profileMap.get(p.coach_id) || null : null,
    }))

    return NextResponse.json({
      payments: enriched,
      count: enriched.length,
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
