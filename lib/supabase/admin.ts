import 'server-only'
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans .env')
}

/**
 * Client Supabase admin — BYPASSE TOUTES LES RLS.
 *
 * ⚠️ NE JAMAIS importer côté client.
 * Le "import 'server-only'" jette une erreur de build si on essaie.
 *
 * À utiliser UNIQUEMENT dans les route handlers admin,
 * APRÈS vérification de l'identité admin via verifyAdmin().
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
