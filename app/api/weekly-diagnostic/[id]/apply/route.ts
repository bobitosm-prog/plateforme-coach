import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { guardCoachManagedCapabilities } from '@/lib/api-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { applyWeeklyDiagnostic } from '@/lib/weekly-diagnostic/apply'
import { z } from 'zod'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await createSupabaseRouteClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ code: 'unauthorized' }, { status: 401 })
    if (!checkRateLimit(`weekly-apply:${user.id}`, 5, 60000).allowed) return NextResponse.json({ code: 'rate_limit' }, { status: 429 })
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ code: 'not_found' }, { status: 404 })
    const denied = await guardCoachManagedCapabilities(user.id)
    if (denied) return denied
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    // Request bodies never supply a plan, targets, owner, or percentage.
    const result = await applyWeeklyDiagnostic(db, user.id, id)
    return NextResponse.json(result, { status: result.status })
  } catch { return NextResponse.json({ code: 'unavailable' }, { status: 503 }) }
}
