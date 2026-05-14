import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/bug-reports
 * Query params :
 *  - type : 'bug' | 'amelioration' | 'autre'
 *  - status : 'nouveau' | 'en_cours' | 'resolu' | 'rejete' | 'unresolved'
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
        admin_reply, replied_at, replied_by, read_by_user,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)

    if (status === 'unresolved') {
      query = query.or('status.is.null,status.eq.nouveau,status.eq.en_cours')
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

    // Tri custom : unresolved en premier, puis par date desc
    const STATUS_RANK: Record<string, number> = {
      'nouveau': 0,
      'en_cours': 1,
      'resolu': 2,
      'rejete': 3,
    }

    const sortedData = (data || []).slice().sort((a, b) => {
      const rankA = STATUS_RANK[a.status as string] ?? 0
      const rankB = STATUS_RANK[b.status as string] ?? 0
      if (rankA !== rankB) return rankA - rankB
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

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
        if (!s || s === 'nouveau' || s === 'en_cours') stats.unresolved++
        if (r.type && stats.by_type[r.type as string] !== undefined) {
          stats.by_type[r.type as string]++
        } else if (r.type) {
          stats.by_type[r.type as string] = 1
        }
      }
    }

    return NextResponse.json({
      reports: sortedData,
      count: sortedData.length,
      stats,
    })
  } catch (err) {
    return handleAdminAuthError(err)
  }
}
