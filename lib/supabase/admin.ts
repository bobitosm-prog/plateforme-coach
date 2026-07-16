import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getSupabaseAdminEnv } from '@/lib/supabase/env'

/**
 * Client Supabase admin — BYPASSE TOUTES LES RLS.
 *
 * ⚠️ NE JAMAIS importer côté client.
 * Le "import 'server-only'" jette une erreur de build si on essaie.
 *
 * À utiliser UNIQUEMENT dans les route handlers admin,
 * APRÈS vérification de l'identité admin via verifyAdmin().
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getSupabaseAdminEnv()
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Compatibility export: keep the historical broad surface until each admin route
// is migrated against the generated schema and its documented schema gaps.
export const supabaseAdmin: SupabaseClient = createSupabaseAdminClient()
