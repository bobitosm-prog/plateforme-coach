import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Returns a Supabase client with service_role privileges.
 * Used for operations that must bypass RLS or call admin APIs
 * (Storage cleanup, auth.admin.deleteUser, RPC with elevated rights).
 */
function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
}

/**
 * DELETE account endpoint.
 *
 * Flow (RGPD/nLPD compliant):
 *   1. Auth check via cookie session
 *   2. Storage cleanup (progress-photos, avatars)
 *   3. RPC delete_user_account → atomic DB-wide cascade
 *   4. auth.admin.deleteUser → final auth identity removal
 *
 * The RPC handles ~45 tables in a single transaction:
 * if anything fails inside, everything rolls back automatically.
 * Storage and auth are handled here because they live outside
 * the PostgreSQL transaction boundary.
 */
export async function POST(req: NextRequest) {
  try {
    // ====================================================
    // 1. Auth check: user must be logged in
    // ====================================================
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
    const userId = user.id

    // ====================================================
    // 2. Service client for the rest
    // ====================================================
    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporairement indisponible' },
        { status: 500 }
      )
    }

    // ====================================================
    // 3. Storage cleanup (best-effort, non-blocking)
    // ====================================================
    // Storage doesn't participate in PostgreSQL transactions,
    // so we clean it BEFORE the RPC. If storage cleanup fails,
    // we log but continue: orphaned files are cosmetic, not
    // functional, and can be cleaned up later by a janitor job.
    try {
      const { data: progressFiles } = await supabase.storage
        .from('progress-photos')
        .list(userId)
      if (progressFiles && progressFiles.length > 0) {
        const paths = progressFiles.map((f) => `${userId}/${f.name}`)
        await supabase.storage.from('progress-photos').remove(paths)
      }
    } catch (storageErr: any) {
      console.error('[delete-account] Storage cleanup progress-photos failed:', storageErr?.message)
    }

    try {
      const { data: avatarFiles } = await supabase.storage
        .from('avatars')
        .list(userId)
      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f) => `${userId}/${f.name}`)
        await supabase.storage.from('avatars').remove(paths)
      }
    } catch (storageErr: any) {
      console.error('[delete-account] Storage cleanup avatars failed:', storageErr?.message)
    }

    // ====================================================
    // 4. RPC delete_user_account — atomic DB-wide deletion
    // ====================================================
    // This is the critical step. The RPC runs all DELETE/UPDATE
    // statements in a single PostgreSQL transaction. If any
    // step fails, EVERYTHING rolls back: the user keeps all their
    // data and we return an error.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'delete_user_account',
      { target_user_id: userId }
    )

    if (rpcError) {
      console.error('[delete-account] RPC delete_user_account failed:', rpcError.message)
      return NextResponse.json(
        { error: `Échec de la suppression : ${rpcError.message}` },
        { status: 500 }
      )
    }

    // ====================================================
    // 5. Delete auth user — final identity removal
    // ====================================================
    // At this point, all DB data is gone. We now remove the
    // auth.users entry so the user can no longer log in.
    // If this fails, we have an orphaned auth user (no data,
    // but can still log in). We log but return success since
    // the major work is done.
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
    if (authErr) {
      console.error('[delete-account] Auth user deletion failed (orphan auth created):', authErr.message)
      // Note: do not return error here. The user data is already
      // gone. Returning an error would suggest nothing was deleted.
      // The orphaned auth user can be cleaned up via the Supabase
      // Dashboard or a janitor script.
    }

    return NextResponse.json({
      success: true,
      deletedAt: (rpcResult as any)?.deleted_at,
    })
  } catch (e: any) {
    console.error('[delete-account] Unexpected error:', e?.message)
    return NextResponse.json(
      { error: e?.message || 'Erreur inattendue' },
      { status: 500 }
    )
  }
}
