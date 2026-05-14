import { NextResponse } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/feedback/mark-all-read
 * Marque toutes les reponses admin du user connecte comme lues.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('bug_reports')
      .update({ read_by_user: true })
      .eq('user_id', user.id)
      .eq('read_by_user', false)
      .not('admin_reply', 'is', null)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      markedCount: data?.length || 0,
    })
  } catch (err) {
    console.error('[feedback/mark-all-read]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
