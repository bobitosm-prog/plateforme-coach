import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { coachId, clientId } = await req.json()

    if (!coachId || !clientId) {
      return NextResponse.json({ error: 'coachId et clientId requis' }, { status: 400 })
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).trim()
    )

    // 1. Update client profile: free invited access
    await supabaseAdmin.from('profiles').update({
      role: 'client',
      subscription_status: 'active',
      subscription_type: 'invited',
      trial_ends_at: null,
    }).eq('id', clientId)

    // 2. Assign to coach
    const { error: ccError } = await supabaseAdmin
      .from('coach_clients')
      .upsert(
        { coach_id: coachId, client_id: clientId, status: 'active' },
        { onConflict: 'coach_id,client_id' }
      )

    if (ccError) {
      return NextResponse.json({ error: ccError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
