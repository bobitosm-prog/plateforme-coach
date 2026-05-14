import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/feedback/mine
 * Retourne les bug_reports du user connecte (via RLS Supabase).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .select(`
        id, type, title, description, status, priority,
        admin_reply, replied_at, replied_by, read_by_user,
        screenshot_url, page_url,
        created_at, updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const unreadCount = (data || []).filter(r =>
      r.admin_reply && r.read_by_user === false
    ).length

    return NextResponse.json({
      reports: data || [],
      count: data?.length || 0,
      unreadCount,
    })
  } catch (err) {
    console.error('[feedback/mine GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
