import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { diagnosticWeek } from '@/lib/weekly-diagnostic/week'

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin(req)
    if (!checkRateLimit(`weekly-monitor:${admin.userId}`, 30, 60000).allowed) return NextResponse.json({ code: 'rate_limit' }, { status: 429 })
    const week = diagnosticWeek().weekStart
    const [runs, ...counts] = await Promise.all([
      supabaseAdmin.from('weekly_generation_runs').select('*').order('started_at', { ascending: false }).limit(20),
      ...['pending','running','succeeded','blocked','failed'].map(status => supabaseAdmin.from('weekly_generation_jobs')
        .select('user_id', { count: 'exact', head: true }).eq('week_start', week).eq('status', status)),
      supabaseAdmin.from('weekly_generation_jobs').select('user_id', {count:'exact',head:true}).eq('week_start',week).in('status',['pending','running']).gt('failures',0),
    ])
    if (runs.error || counts.some(row => row.error)) return NextResponse.json({ code: 'unavailable' }, { status: 503 })
    const last = runs.data?.[0]
    const stale = !last || Date.now()-Date.parse(last.started_at)>15*60000
    return NextResponse.json({ week, stale, runs: runs.data, counts: Object.fromEntries(['pending','running','succeeded','blocked','failed','retrying'].map((key,i) => [key,counts[i].count ?? 0])) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return handleAdminAuthError(error) }
}
