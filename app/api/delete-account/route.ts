import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporairement indisponible' },
        { status: 500 }
      )
    }

    const { userId } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Delete data in order (respecting foreign keys)
    const tableDeletions: { table: string; column: string }[] = [
      { table: 'workout_sets', column: 'user_id' },
      { table: 'workout_sessions', column: 'user_id' },
      { table: 'weight_logs', column: 'user_id' },
      { table: 'meal_logs', column: 'user_id' },
      { table: 'meal_tracking', column: 'user_id' },
      { table: 'body_measurements', column: 'user_id' },
      { table: 'custom_foods', column: 'user_id' },
      { table: 'user_programs', column: 'user_id' },
      { table: 'coach_clients', column: 'client_id' },
      { table: 'coach_notes', column: 'client_id' },
      { table: 'client_programs', column: 'client_id' },
      { table: 'client_meal_plans', column: 'client_id' },
      { table: 'meal_plans', column: 'user_id' },
    ]

    for (const { table, column } of tableDeletions) {
      const { error } = await supabase.from(table).delete().eq(column, userId)
      if (error) {
        console.error(`[delete-account] Error deleting from ${table}:`, error.message)
      }
    }

    // Delete messages (sender OR receiver)
    const { error: msgErr1 } = await supabase.from('messages').delete().eq('sender_id', userId)
    if (msgErr1) console.error('[delete-account] Error deleting messages (sender):', msgErr1.message)
    const { error: msgErr2 } = await supabase.from('messages').delete().eq('receiver_id', userId)
    if (msgErr2) console.error('[delete-account] Error deleting messages (receiver):', msgErr2.message)

    // Remaining tables
    const remainingTables: { table: string; column: string }[] = [
      { table: 'push_subscriptions', column: 'user_id' },
      { table: 'progress_photos', column: 'user_id' },
      { table: 'payments', column: 'client_id' },
    ]

    for (const { table, column } of remainingTables) {
      const { error } = await supabase.from(table).delete().eq(column, userId)
      if (error) {
        console.error(`[delete-account] Error deleting from ${table}:`, error.message)
      }
    }

    // Delete storage files: progress-photos/{userId}/
    const { data: progressFiles } = await supabase.storage
      .from('progress-photos')
      .list(userId)
    if (progressFiles && progressFiles.length > 0) {
      const paths = progressFiles.map((f) => `${userId}/${f.name}`)
      await supabase.storage.from('progress-photos').remove(paths)
    }

    // Delete storage files: avatars/{userId}/
    const { data: avatarFiles } = await supabase.storage
      .from('avatars')
      .list(userId)
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${userId}/${f.name}`)
      await supabase.storage.from('avatars').remove(paths)
    }

    // Delete profile
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId)
    if (profileErr) {
      console.error('[delete-account] Error deleting profile:', profileErr.message)
    }

    // Delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
    if (authErr) {
      console.error('[delete-account] Error deleting auth user:', authErr.message)
      return NextResponse.json(
        { error: `Failed to delete auth user: ${authErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[delete-account]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
