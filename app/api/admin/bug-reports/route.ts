import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/bug-reports
 * Query params :
 *  - type : 'bug' | 'amelioration' | 'autre'
 *  - status : 'new' | 'in_progress' | 'resolved' | 'wontfix' | 'unresolved'
 *  - search : ilike sur title et description
 *  - limit : defaut 200, max 500
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req)

    const url = new URL(req.url)
    const type = url.searchParams.get('type')?.trim() || ''
    const status = url.searchParams.get('status')?.trim() || ''
    const search = url.searchParams.get('search')?.trim() || ''
    const limitParam = parseInt(url.searchParams.get('limit') || '200', 10)
    const limit = Math.min(Math.max(limitParam, 1), 500)

    let query = supabaseAdmin
      .from('bug_reports')
      .select(`
        id, user_id, user_email, user_role,
        type, title, description, screenshot_url, page_url,
        status, priority, admin_notes,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)

    if (status === 'unresolved') {
      query = query.or('status.is.null,status.eq.new,status.eq.in_progress')
    } else if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/bug-reports GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Compteurs pour KPIs
    const { data: counters } = await supabaseAdmin
      .from('bug_reports')
      .select('type, status')

    const stats = {
      total: counters?.length || 0,
      unresolved: 0,
      by_type: { bug: 0, amelioration: 0, autre: 0 } as Record<string, number>,
    }

    if (counters) {
      for (const r of counters) {
        const s = r.status as string | null
        if (!s || s === 'new' || s === 'in_progress') stats.unresolved++
        if (r.type && stats.by_type[r.type as string] !== undefined) {
          stats.by_type[r.type as string]++
        } else if (r.type) {
          stats.by_type[r.type as string] = 1
        }
      }
    }

    return NextResponse.json({
      reports: data || [],
      count: data?.length || 0,
      stats,
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
