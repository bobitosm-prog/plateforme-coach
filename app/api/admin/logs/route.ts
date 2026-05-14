import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/logs
 * Query :
 *  - level : filtre exact (ex: 'admin_action', 'error')
 *  - action : filtre sur details->>action
 *  - limit : defaut 100, max 500
 *  - search : ilike sur message
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    const url = new URL(req.url)
    const level = url.searchParams.get('level')?.trim() || ''
    const action = url.searchParams.get('action')?.trim() || ''
    const search = url.searchParams.get('search')?.trim() || ''
    const limitParam = parseInt(url.searchParams.get('limit') || '100', 10)
    const limit = Math.min(Math.max(limitParam, 1), 500)

    let query = supabaseAdmin
      .from('app_logs')
      .select('id, level, message, details, user_id, user_email, page_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (level) query = query.eq('level', level)
    if (search) query = query.ilike('message', `%${search}%`)
    if (action) query = query.filter('details->>action', 'eq', action)

    const { data, error } = await query

    if (error) {
      console.error('[admin/logs GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data || [], count: data?.length || 0 })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
