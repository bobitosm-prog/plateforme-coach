import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Auth check: user can only assign a coach to themselves
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { coachId, autoAssign } = await req.json()
    const clientId = user.id

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).trim()
    )

    // Resolve coach ID
    let finalCoachId = coachId
    if (!finalCoachId || autoAssign) {
      const coachEmail = process.env.NEXT_PUBLIC_COACH_EMAIL || 'fe.ma@bluewin.ch'
      const { data: defaultCoach } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', coachEmail)
        .maybeSingle()
      if (defaultCoach) finalCoachId = defaultCoach.id
    }

    if (!finalCoachId) {
      return NextResponse.json({ error: 'Aucun coach trouvé' }, { status: 400 })
    }

    if (autoAssign) {
      // Auto-assign to fe.ma — keep normal trial flow (NO invited status)
      await supabaseAdmin.from('profiles').update({
        role: 'client',
      }).eq('id', clientId)
    } else {
      // Invited by a coach — free access
      await supabaseAdmin.from('profiles').update({
        role: 'client',
        subscription_status: 'active',
        subscription_type: 'invited',
        trial_ends_at: null,
      }).eq('id', clientId)
    }

    // Assign to coach
    const { error: ccError } = await supabaseAdmin
      .from('coach_clients')
      .upsert(
        { coach_id: finalCoachId, client_id: clientId, status: 'active' },
        { onConflict: 'coach_id,client_id' }
      )

    if (ccError) {
      return NextResponse.json({ error: ccError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, coachId: finalCoachId, autoAssign: !!autoAssign })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
